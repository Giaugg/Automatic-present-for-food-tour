const pool = require('../config/db');

// 1. Lấy danh sách tất cả các tour
exports.getAllTours = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM tours WHERE is_active = TRUE ORDER BY id DESC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Lấy chi tiết tour và danh sách các POIs (Dùng JOIN và GROUP BY)
exports.getTourDetails = async (req, res) => {
    const { id } = req.params;
    const { lang = 'en' } = req.query; // Hỗ trợ lấy tên POI theo ngôn ngữ

    try {
        const query = `
            SELECT 
                t.*,
                json_agg(
                    json_build_object(
                        'step_order', ti.step_order,
                        'poi_id', p.id,
                        'latitude', p.latitude,
                        'longitude', p.longitude,
                        'name', pt.name,
                        'thumbnail', p.thumbnail_url
                    ) ORDER BY ti.step_order ASC
                ) AS stops
            FROM tours t
            LEFT JOIN tour_items ti ON t.id = ti.tour_id
            LEFT JOIN pois p ON ti.poi_id = p.id
            LEFT JOIN poi_translations pt ON p.id = pt.poi_id AND pt.language_code = $2
            WHERE t.id = $1
            GROUP BY t.id
        `;
        
        const result = await pool.query(query, [id, lang]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy tour" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Tạo Tour mới
exports.createTour = async (req, res) => {
    const { name, description, thumbnail_url, total_duration_minutes } = req.body;
    // Lưu ý: name và description phải là object JSON (ví dụ: {"en": "Old Town", "vi": "Phố Cổ"})
    
    try {
        const result = await pool.query(
            `INSERT INTO tours (name, description, thumbnail_url, total_duration_minutes) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, description, thumbnail_url, total_duration_minutes]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Thêm điểm dừng (POI) và Cập nhật danh sách điểm dừng (Reorder) vào Tour
exports.addPoiToTour = async (req, res) => {
    const { id } = req.params; // tour_id
    const { items } = req.body; // Kỳ vọng nhận vào mảng: [{poi_id, step_order}, ...]

    // Kiểm tra đầu vào
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Danh sách điểm dừng (items) không hợp lệ" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Kiểm tra tour có tồn tại không
        const tourCheck = await client.query('SELECT id FROM tours WHERE id = $1', [id]);
        if (tourCheck.rows.length === 0) {
            throw new Error("Tour không tồn tại");
        }

        // 2. Xóa các liên kết cũ trong tour_items để làm mới hoàn toàn thứ tự
        // (Hoặc có thể dùng ON CONFLICT nếu bạn chỉ muốn cập nhật những cái gửi lên)
        await client.query('DELETE FROM tour_items WHERE tour_id = $1', [id]);

        // 3. Chèn lại danh sách điểm dừng mới với thứ tự mới
        const insertQuery = `
            INSERT INTO tour_items (tour_id, poi_id, step_order) 
            VALUES ($1, $2, $3)
        `;

        for (const item of items) {
            await client.query(insertQuery, [id, item.poi_id, item.step_order]);
        }

        await client.query('COMMIT');

        res.json({ 
            message: "Cập nhật lộ trình và thứ tự các điểm dừng thành công",
            total_items: items.length 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Reorder Error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// 5. Xóa POI khỏi Tour
exports.removePoiFromTour = async (req, res) => {
    const { id, poi_id } = req.params;
    try {
        await pool.query('DELETE FROM tour_items WHERE tour_id = $1 AND poi_id = $2', [id, poi_id]);
        res.json({ message: "Đã xóa điểm dừng khỏi tour" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 6. Cập nhật thông tin Tour
exports.updateTour = async (req, res) => {
    const { id } = req.params;
    const fields = req.body; // Lấy các trường cần update từ body (name, description, thumbnail_url, ...)

    // Kiểm tra nếu không có dữ liệu gửi lên
    if (Object.keys(fields).length === 0) {
        return res.status(400).json({ message: "Không có dữ liệu để cập nhật" });
    }

    try {
        const setClause = [];
        const values = [];
        let index = 1;

        // Xây dựng câu lệnh SET động: name=$1, description=$2...
        for (const [key, value] of Object.entries(fields)) {
            // Chỉ cho phép update các trường hợp lệ trong bảng tours
            const allowedFields = ['name', 'description', 'thumbnail_url', 'total_duration_minutes', 'is_active'];
            if (allowedFields.includes(key)) {
                setClause.push(`${key} = $${index}`);
                // Nếu là name hoặc description, đảm bảo lưu dưới dạng JSON string nếu cần
                values.push(value);
                index++;
            }
        }

        if (setClause.length === 0) {
            return res.status(400).json({ message: "Các trường cập nhật không hợp lệ" });
        }

        values.push(id); // Tham số cuối cùng cho WHERE id = $x
        const query = `
            UPDATE tours 
            SET ${setClause.join(', ')} 
            WHERE id = $${index} 
            RETURNING *`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy tour để cập nhật" });
        }

        res.json({
            message: "Cập nhật tour thành công",
            data: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// 7. Xóa hoàn toàn một Tour
exports.deleteTour = async (req, res) => {
    const { id } = req.params;

    try {
        // Thực hiện xóa tour
        const result = await pool.query(
            'DELETE FROM tours WHERE id = $1 RETURNING *',
            [id]
        );

        // Kiểm tra xem tour có tồn tại để xóa không
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy tour để xóa"
            });
        }

        res.json({
            success: true,
            message: `Đã xóa tour: ${JSON.stringify(result.rows[0].name.en || result.rows[0].name)} thành công`,
            deletedTourId: id
        });

    } catch (err) {
        console.error('Delete Tour Error:', err.message);
        res.status(500).json({
            success: false,
            error: "Lỗi server khi xóa tour"
        });
    }
};