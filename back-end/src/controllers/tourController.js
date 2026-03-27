const pool = require('../config/db');

// 1. Lấy danh sách tất cả các tour (kèm bản dịch theo ngôn ngữ)
exports.getAllTours = async (req, res) => {
    const { lang = 'vi' } = req.query;
    try {
        const result = await pool.query(`
            SELECT t.*, tt.title, tt.summary
            FROM tours t
            LEFT JOIN tour_translations tt ON t.id = tt.tour_id AND tt.language_code = $1
            WHERE t.is_active = TRUE 
            ORDER BY t.created_at DESC`,
            [lang]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy danh sách tour: " + err.message });
    }
};

// 2. Lấy chi tiết tour và lộ trình các POIs (Step-by-step)
exports.getTourDetails = async (req, res) => {
    const { id } = req.params;
    const { lang = 'vi' } = req.query;

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
            LEFT JOIN poi_translations pt ON p.id = pt.poi_id AND pt.language_code = $1
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
    // translations: [{ language_code: 'vi', title: '...', summary: '...' }, ...]

    try {
        await client.query('BEGIN');

        // 1. Chèn vào bảng tours
        const tourRes = await client.query(
            `INSERT INTO tours (price, thumbnail_url) VALUES ($1::DECIMAL, $2) RETURNING id`,
            [price || 0, thumbnail_url]
        );
        const tourId = tourRes.rows[0].id;

        // 2. Chèn bản dịch
        if (translations && Array.isArray(translations)) {
            for (const t of translations) {
                await client.query(
                    `INSERT INTO tour_translations (tour_id, language_code, title, summary) VALUES ($1, $2, $3, $4)`,
                    [tourId, t.language_code, t.title, t.summary]
                );
            }
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Xóa lộ trình cũ
      await client.query('DELETE FROM tour_items WHERE tour_id = $1::UUID', [id]);

      // Chèn lộ trình mới
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            'INSERT INTO tour_items (tour_id, poi_id, step_order) VALUES ($1, $2, $3)',
            [id, item.poi_id, item.step_order]
          );
        }
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
                    [id, t.language_code, t.title, t.summary]
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