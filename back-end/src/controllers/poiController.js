const pool = require('../config/db');

// --- 1. READ ALL (Lấy danh sách POI kèm bản dịch theo ngôn ngữ) ---
exports.getAllPOIs = async (req, res) => {
    // Mặc định lấy tiếng Việt ('vi')
    const { lang = 'vi' } = req.query; 
    
    try {
        const result = await pool.query(`
            SELECT 
                p.id, 
                p.owner_id, 
                p.latitude, 
                p.longitude, 
                p.trigger_radius, 
                p.thumbnail_url, 
                p.category, 
                p.status, 
                p.updated_at,
                pt.name, 
                pt.description, 
                pt.audio_url,
                pt.audio_duration_seconds
            FROM pois p
            LEFT JOIN poi_translations pt ON p.id = pt.poi_id AND pt.language_code = $1
            WHERE p.status = TRUE
            ORDER BY p.updated_at DESC`, 
            [lang]
        );
        
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy danh sách địa điểm: " + err.message });
    }
};

// --- 2. GET DETAILS (Chi tiết POI, tất cả ngôn ngữ và hình ảnh) ---
exports.getPOIDetails = async (req, res) => {
    const { id } = req.params;
    
    try {
        // 1. Lấy thông tin gốc từ bảng pois
        const poiResult = await pool.query('SELECT * FROM pois WHERE id = $1::UUID', [id]);
        
        if (poiResult.rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy địa điểm này" });
        }

        // 2. Lấy tất cả các bản dịch đa ngôn ngữ
        const translations = await pool.query(
            'SELECT language_code, name, description, audio_url, audio_duration_seconds FROM poi_translations WHERE poi_id = $1::UUID', 
            [id]
        );

        // 3. Lấy danh sách hình ảnh (poi_images)
        const images = await pool.query(
            'SELECT id, full_image_url, thumbnail_url, caption, display_order FROM poi_images WHERE poi_id = $1::UUID ORDER BY display_order ASC', 
            [id]
        );

        // Gộp dữ liệu trả về theo cấu trúc POIDetail Interface
        const poiData = {
            ...poiResult.rows[0],
            translations: translations.rows,
            images: images.rows
        };

        res.json(poiData);
    } catch (err) {
        res.status(500).json({ error: "Lỗi lấy chi tiết địa điểm: " + err.message });
    }
};

// --- 3. CREATE (Tạo POI kèm bản dịch) ---
exports.createPOI = async (req, res) => {
    const client = await pool.connect();
    const { 
        latitude, 
        longitude, 
        trigger_radius, 
        category, 
        thumbnail_url, 
        owner_id, 
        translations 
    } = req.body;

    try {
        await client.query('BEGIN');

        // 1. Chèn vào bảng POIs (Ép kiểu dữ liệu để an toàn)
        const poiResult = await client.query(`
            INSERT INTO pois (owner_id, latitude, longitude, trigger_radius, category, thumbnail_url)
            VALUES ($1, $2::FLOAT, $3::FLOAT, $4::INT, $5, $6) 
            RETURNING id`,
            [owner_id || null, latitude, longitude, trigger_radius || 25, category, thumbnail_url]
        );
        const poiId = poiResult.rows[0].id;

        // 2. Chèn các bản dịch đa ngôn ngữ
        if (translations && Array.isArray(translations)) {
            for (const t of translations) {
                await client.query(`
                    INSERT INTO poi_translations (poi_id, language_code, name, description, audio_url)
                    VALUES ($1::UUID, $2, $3, $4, $5)`,
                    [poiId, t.language_code, t.name, t.description, t.audio_url]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ 
            message: "Tạo địa điểm thành công", 
            id: poiId 
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Lỗi tạo địa điểm: " + err.message });
    } finally {
        client.release();
    }
};

// --- 4. UPDATE (Cập nhật POI & Upsert bản dịch) ---
exports.updatePOI = async (req, res) => {
    const client = await pool.connect();
    const { id } = req.params;
    const { 
        latitude, 
        longitude, 
        trigger_radius, 
        category, 
        status, 
        thumbnail_url, 
        translations 
    } = req.body;

    try {
        await client.query('BEGIN');

        // 1. Cập nhật thông tin cơ bản
        const updateResult = await client.query(`
            UPDATE pois 
            SET latitude = $1::FLOAT, 
                longitude = $2::FLOAT, 
                trigger_radius = $3::INT, 
                category = $4, 
                status = $5, 
                thumbnail_url = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7::UUID`,
            [latitude, longitude, trigger_radius, category, status, thumbnail_url, id]
        );

        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Địa điểm không tồn tại" });
        }

        // 2. Cập nhật bản dịch sử dụng ON CONFLICT (Upsert)
        if (translations && Array.isArray(translations)) {
            for (const t of translations) {
                await client.query(`
                    INSERT INTO poi_translations (poi_id, language_code, name, description, audio_url)
                    VALUES ($1::UUID, $2, $3, $4, $5)
                    ON CONFLICT (poi_id, language_code) 
                    DO UPDATE SET 
                        name = EXCLUDED.name, 
                        description = EXCLUDED.description, 
                        audio_url = EXCLUDED.audio_url`,
                    [id, t.language_code, t.name, t.description, t.audio_url]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: "Cập nhật địa điểm thành công" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Lỗi cập nhật: " + err.message });
    } finally {
        client.release();
    }
};

// --- 5. DELETE (Xóa POI) ---
exports.deletePOI = async (req, res) => {
    const { id } = req.params;
    try {
        // Cascade delete trong DB sẽ tự dọn dẹp các bảng con (translations, images, reviews)
        const result = await pool.query('DELETE FROM pois WHERE id = $1::UUID', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Địa điểm không tồn tại" });
        }
        
        res.json({ message: "Đã xóa địa điểm thành công" });
    } catch (err) {
        res.status(500).json({ error: "Lỗi khi xóa: " + err.message });
    }
};