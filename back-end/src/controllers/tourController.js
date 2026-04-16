const pool = require('../config/db');

const normalizeLangCode = (lang = 'vi-VN') => {
    const input = String(lang).trim();
    if (input.toLowerCase() === 'vi') return 'vi-VN';
    if (input.toLowerCase() === 'en') return 'en-US';
    if (input.toLowerCase() === 'ja') return 'ja-JP';
    return input;
};

const validateTranslations = (translations) => {
    if (!Array.isArray(translations) || translations.length === 0) {
        return 'translations phải là mảng và không được rỗng';
    }

    for (const t of translations) {
        if (!t?.language_code || !t?.title) {
            return 'Mỗi bản dịch cần có language_code và title';
        }
    }

    return null;
};

const validateScheduleItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        return 'items phải là mảng và không được rỗng';
    }

    const stepSet = new Set();
    const poiSet = new Set();
    for (const item of items) {
        if (!item?.poi_id || typeof item.step_order !== 'number') {
            return 'Mỗi item cần có poi_id và step_order kiểu number';
        }
        if (stepSet.has(item.step_order)) {
            return 'step_order bị trùng trong cùng tour';
        }
        if (poiSet.has(item.poi_id)) {
            return 'poi_id bị trùng trong cùng tour';
        }
        stepSet.add(item.step_order);
        poiSet.add(item.poi_id);
    }

    return null;
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

// 1. Lấy danh sách tất cả các tour (kèm bản dịch theo ngôn ngữ)
exports.getAllTours = async (req, res) => {
    const lang = normalizeLangCode(req.query.lang || 'vi-VN');
    const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';
    try {
        const result = await pool.query(`
            SELECT t.*, tt.title, tt.summary
            FROM tours t
            LEFT JOIN tour_translations tt ON t.id = tt.tour_id AND tt.language_code = $1
            WHERE ($2::boolean = TRUE OR t.is_active = TRUE)
            ORDER BY t.created_at DESC`,
            [lang, includeInactive]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy danh sách tour: " + err.message });
    }
};

// 2. Lấy chi tiết tour và lộ trình các POIs (Step-by-step)
exports.getTourDetails = async (req, res) => {
    const { id } = req.params;
    const lang = normalizeLangCode(req.query.lang || 'vi-VN');

    try {
        const query = `
            SELECT 
                t.*,
                tt.title,
                tt.summary,
                json_agg(
                    json_build_object(
                        'step_order', ti.step_order,
                        'poi_id', p.id,
                        'latitude', p.latitude,
                        'longitude', p.longitude,
                        'category', p.category,
                        'name', pt.name,
                        'thumbnail', p.thumbnail_url,
                        'audio_url', pt.audio_url
                    ) ORDER BY ti.step_order ASC
                ) FILTER (WHERE p.id IS NOT NULL) AS stops
            FROM tours t
            LEFT JOIN tour_translations tt ON t.id = tt.tour_id AND tt.language_code = $1
            LEFT JOIN tour_items ti ON t.id = ti.tour_id
            LEFT JOIN pois p ON ti.poi_id = p.id
            LEFT JOIN languages l ON l.code = $1
            LEFT JOIN poi_translations pt ON p.id = pt.poi_id AND pt.language_id = l.id
            WHERE t.id = $2::UUID
            GROUP BY t.id, tt.title, tt.summary
        `;
        
        const result = await pool.query(query, [lang, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy tour" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy chi tiết tour: " + err.message });
    }
};

// 3. Tạo Tour mới kèm bản dịch
exports.createTour = async (req, res) => {
    const client = await pool.connect();
    const { price, thumbnail_url, translations } = req.body;

    const translationError = validateTranslations(translations);
    if (translationError) {
        return res.status(400).json({ error: translationError });
    }

    try {
        await client.query('BEGIN');

        // 1. Chèn vào bảng tours
        const tourRes = await client.query(
            `INSERT INTO tours (price, thumbnail_url) VALUES ($1::DECIMAL, $2) RETURNING id`,
            [price || 0, thumbnail_url]
        );
        const tourId = tourRes.rows[0].id;

        // 2. Chèn bản dịch
        for (const t of translations) {
            await client.query(
                `INSERT INTO tour_translations (tour_id, language_code, title, summary) VALUES ($1, $2, $3, $4)`,
                [tourId, normalizeLangCode(t.language_code), t.title, t.summary || null]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: "Tạo tour thành công", id: tourId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Lỗi tạo tour: " + err.message });
    } finally {
        client.release();
    }
};

// 4. Cập nhật lộ trình (Reorder POIs)
exports.updateTourSchedule = async (req, res) => {
    const { id } = req.params; // tour_id
    const { items } = req.body; // [{poi_id, step_order}, ...]

        const scheduleError = validateScheduleItems(items);
        if (scheduleError) {
            return res.status(400).json({ error: scheduleError });
        }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

            const poiIds = items.map((item) => item.poi_id);
            const poiCheck = await client.query(
                'SELECT id FROM pois WHERE id = ANY($1::uuid[])',
                [poiIds]
            );

            if (poiCheck.rowCount !== poiIds.length) {
                throw new Error('Danh sách items có poi_id không tồn tại');
            }

      // Xóa lộ trình cũ
      await client.query('DELETE FROM tour_items WHERE tour_id = $1::UUID', [id]);

      // Chèn lộ trình mới
            for (const item of items) {
                await client.query(
                    'INSERT INTO tour_items (tour_id, poi_id, step_order) VALUES ($1, $2, $3)',
                    [id, item.poi_id, item.step_order]
                );
      }

      await client.query('COMMIT');
      res.json({ message: "Cập nhật lộ trình thành công" });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: "Lỗi cập nhật lộ trình: " + err.message });
    } finally {
      client.release();
    }
};

// 5. Cập nhật thông tin Tour & Bản dịch
exports.updateTour = async (req, res) => {
    const { id } = req.params;
    const { price, thumbnail_url, is_active, translations } = req.body;
    const client = await pool.connect();

    if (translations) {
        const translationError = validateTranslations(translations);
        if (translationError) {
            return res.status(400).json({ error: translationError });
        }
    }

    try {
        await client.query('BEGIN');

        // 1. Update bảng tours
        await client.query(
            `UPDATE tours SET price = $1, thumbnail_url = $2, is_active = $3 WHERE id = $4::UUID`,
            [price, thumbnail_url, is_active, id]
        );

        // 2. Upsert bản dịch
        if (translations && Array.isArray(translations)) {
            for (const t of translations) {
                await client.query(`
                    INSERT INTO tour_translations (tour_id, language_code, title, summary)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (tour_id, language_code) 
                    DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary`,
                    [id, normalizeLangCode(t.language_code), t.title, t.summary || null]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: "Cập nhật tour thành công" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Lỗi cập nhật tour: " + err.message });
    } finally {
        client.release();
    }
};

// 6. Xóa hoàn toàn một Tour
exports.deleteTour = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM tours WHERE id = $1::UUID RETURNING id', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Không tìm thấy tour" });
        res.json({ message: "Xóa tour thành công" });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi xóa tour: " + err.message });
    }
};

// 7. Upload thumbnail cho Tour
exports.uploadTourThumbnail = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file ảnh được gửi lên' });
        }

        const thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;
        res.status(201).json({ message: 'Upload thumbnail thành công', thumbnail_url: thumbnailUrl });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi upload thumbnail: ' + err.message });
    }
};

// 2.1. Lấy lịch sử mua tour của user hiện tại
exports.getMyPurchases = async (req, res) => {
    const lang = normalizeLangCode(req.query.lang || 'vi-VN');
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ message: 'Chưa xác thực danh tính' });
    }

    try {
        const result = await pool.query(
            `SELECT
                tp.id AS purchase_id,
                tp.tour_id,
                tp.purchase_price,
                tp.status,
                tp.progress_step,
                tp.completed_at,
                tp.purchased_at,
                t.thumbnail_url,
                t.is_active,
                tt.title,
                tt.summary,
                COALESCE(step_counts.total_steps, 0) AS total_steps
             FROM tour_purchases tp
             JOIN tours t ON t.id = tp.tour_id
             LEFT JOIN tour_translations tt
                ON tt.tour_id = t.id AND tt.language_code = $2
             LEFT JOIN (
                SELECT tour_id, COUNT(*)::INT AS total_steps
                FROM tour_items
                GROUP BY tour_id
             ) step_counts ON step_counts.tour_id = t.id
             WHERE tp.user_id = $1::UUID
             ORDER BY tp.purchased_at DESC`,
            [userId, lang]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi lấy lịch sử mua tour: ' + err.message });
    }
};

// 2.2. Mua tour bằng ví người dùng
exports.purchaseTour = async (req, res) => {
    const userId = req.user?.id;
    const { id: tourId } = req.params;

    if (!userId) {
        return res.status(401).json({ message: 'Chưa xác thực danh tính' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const tourResult = await client.query(
            'SELECT id, price, is_active FROM tours WHERE id = $1::UUID',
            [tourId]
        );

        if (tourResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Không tìm thấy tour' });
        }

        const tour = tourResult.rows[0];
        if (!tour.is_active) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Tour hiện không còn hoạt động' });
        }

        const duplicateResult = await client.query(
            `SELECT id
             FROM tour_purchases
             WHERE user_id = $1::UUID AND tour_id = $2::UUID AND status = 'paid'
             LIMIT 1`,
            [userId, tourId]
        );

        if (duplicateResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Bạn đã mua tour này rồi' });
        }

        const userResult = await client.query(
            'SELECT balance, points FROM users WHERE id = $1::UUID FOR UPDATE',
            [userId]
        );

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        const currentBalance = toNumber(userResult.rows[0].balance);
        const tourPrice = toNumber(tour.price);

        if (currentBalance < tourPrice) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: 'Số dư không đủ để mua tour',
                required: tourPrice,
                current_balance: currentBalance,
            });
        }

        const nextBalance = currentBalance - tourPrice;
        const rewardPoints = Math.floor(tourPrice / 10000);

        const purchaseResult = await client.query(
            `INSERT INTO tour_purchases (user_id, tour_id, purchase_price, status)
             VALUES ($1::UUID, $2::UUID, $3::DECIMAL, 'paid')
             RETURNING id, purchased_at, status`,
            [userId, tourId, tourPrice]
        );

        await client.query(
            `UPDATE users
             SET balance = $1::DECIMAL,
                 points = points + $2::INT
             WHERE id = $3::UUID`,
            [nextBalance, rewardPoints, userId]
        );

        await client.query(
            `INSERT INTO wallet_transactions
                (user_id, txn_type, amount, balance_before, balance_after, ref_type, ref_id, note)
             VALUES
                ($1::UUID, 'tour_purchase', $2::DECIMAL, $3::DECIMAL, $4::DECIMAL, 'tour_purchase', $5::UUID, $6)`,
            [
                userId,
                -tourPrice,
                currentBalance,
                nextBalance,
                purchaseResult.rows[0].id,
                `Thanh toán tour ${tourId}`,
            ]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Mua tour thành công',
            purchase: purchaseResult.rows[0],
            wallet: {
                previous_balance: currentBalance,
                current_balance: nextBalance,
            },
            reward_points: rewardPoints,
        });
    } catch (err) {
        await client.query('ROLLBACK');

        if (err.code === '23505') {
            return res.status(409).json({ message: 'Bạn đã mua tour này rồi' });
        }

        res.status(500).json({ error: 'Lỗi mua tour: ' + err.message });
    } finally {
        client.release();
    }
};

// 2.3. Cập nhật tiến độ tour đã mua
exports.updateMyPurchaseProgress = async (req, res) => {
    const userId = req.user?.id;
    const { purchaseId } = req.params;
    const progressStep = Number(req.body?.progress_step);

    if (!userId) {
        return res.status(401).json({ message: 'Chưa xác thực danh tính' });
    }

    if (!Number.isInteger(progressStep) || progressStep < 0) {
        return res.status(400).json({ message: 'progress_step phải là số nguyên >= 0' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const purchaseResult = await client.query(
            `SELECT id, tour_id, user_id, progress_step, status
             FROM tour_purchases
             WHERE id = $1::UUID
             FOR UPDATE`,
            [purchaseId]
        );

        if (purchaseResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Không tìm thấy bản ghi tour đã mua' });
        }

        const purchase = purchaseResult.rows[0];
        if (purchase.user_id !== userId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Bạn không có quyền cập nhật tiến độ tour này' });
        }

        const stepsResult = await client.query(
            'SELECT COUNT(*)::INT AS total_steps FROM tour_items WHERE tour_id = $1::UUID',
            [purchase.tour_id]
        );
        const totalSteps = Number(stepsResult.rows[0]?.total_steps || 0);

        if (totalSteps <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Tour chưa có lộ trình để cập nhật tiến độ' });
        }

        const normalizedProgress = Math.min(progressStep, totalSteps);
        const nextStatus = normalizedProgress >= totalSteps ? 'completed' : 'paid';

        const updateResult = await client.query(
            `UPDATE tour_purchases
             SET progress_step = $1::INT,
                 status = $2,
                 completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END,
                 updated_at = NOW()
             WHERE id = $3::UUID
             RETURNING id, tour_id, progress_step, status, completed_at, updated_at`,
            [normalizedProgress, nextStatus, purchaseId]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Cập nhật tiến độ tour thành công',
            purchase: updateResult.rows[0],
            total_steps: totalSteps,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Lỗi cập nhật tiến độ tour: ' + err.message });
    } finally {
        client.release();
    }
};