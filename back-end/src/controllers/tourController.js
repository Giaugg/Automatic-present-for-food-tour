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