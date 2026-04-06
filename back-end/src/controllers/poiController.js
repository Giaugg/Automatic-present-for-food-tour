const pool = require("../config/db");
const path = require("path");
const fs = require("fs");
const translationService = require("../services/translationService");
const audioService = require("../services/audioService");

const poiController = {
    // 1. GET ALL: Lấy danh sách POI kèm bản dịch theo ngôn ngữ
    getAll: async (req, res) => {
        try {
            const langCode = req.query.lang || "vi-VN";

            const query = `
                SELECT 
                    p.id, p.latitude, p.longitude, p.category, p.thumbnail_url,
                    pt.name, pt.description, pt.audio_url
                FROM pois p
                LEFT JOIN languages l ON l.code = $1
                LEFT JOIN poi_translations pt 
                    ON pt.poi_id = p.id AND pt.language_id = l.id
                ORDER BY p.created_at DESC
            `;

            const result = await pool.query(query, [langCode]);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    getMyPois: async (req, res) => {
        const userId = req.user.id; // ID lấy từ Token sau khi qua Middleware
        
        try {
        // Truy vấn các POI thuộc sở hữu của user này
        // Join thêm bảng translations để lấy tên (mặc định lấy tiếng Việt)
        const result = await pool.query(`
            SELECT p.*, pt.name, pt.description 
            FROM pois p
            LEFT JOIN poi_translations pt ON p.id = pt.poi_id
            JOIN languages l ON pt.language_id = l.id
            WHERE p.owner_id = $1 AND l.code = 'vi-VN'
        `, [userId]);

        res.json({
            success: true,
            count: result.rowCount,
            data: result.rows
        });
        } catch (err) {
        console.log('Lỗi getMyPois:', err.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
        }
    },

    getDetails: async (req, res) => {
        const { id } = req.params;
        try {
            // Lấy thông tin POI gốc
            const poiRes = await pool.query(`SELECT * FROM pois WHERE id = $1`, [id]);
            if (poiRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: "POI không tồn tại" });
            }

            // Lấy tất cả bản dịch của POI này
            const transRes = await pool.query(`
                SELECT pt.*, l.code as language_code 
                FROM poi_translations pt
                JOIN languages l ON pt.language_id = l.id
                WHERE pt.poi_id = $1
            `, [id]);

            const poiData = poiRes.rows[0];
            poiData.translations = transRes.rows;

            res.json({ success: true, data: poiData });
        } catch (err) {
            console.log('Lỗi getDetails:', err.message);
            res.status(500).json({ error: err.message });
        }
    },

    // 2. GET NEARBY: Tìm các POI trong bán kính (m) xung quanh tọa độ user
    getNearby: async (req, res) => {
        const { lat, lng, radius = 500, lang = "vi-VN" } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: "Thiếu tọa độ lat/lng" });
        }

        try {
            // Công thức Haversine tính khoảng cách (mét)
            const query = `
                SELECT p.*, pt.name, pt.description, pt.audio_url,
                (6371000 * acos(
                    cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2)) + 
                    sin(radians($1)) * sin(radians(p.latitude))
                )) AS distance
                FROM pois p
                LEFT JOIN languages l ON l.code = $4
                LEFT JOIN poi_translations pt ON pt.poi_id = p.id AND pt.language_id = l.id
                WHERE (
                    6371000 * acos(
                        cos(radians($1)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($2)) + 
                        sin(radians($1)) * sin(radians(p.latitude))
                    )
                ) <= $3
                ORDER BY distance ASC
            `;
            const result = await pool.query(query, [lat, lng, radius, lang]);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    getById: async (req, res) => {
        const { id } = req.params;
        const { lang } = req.query; // Lấy langCode từ query string: ?lang=en-US

        try {
            // Sử dụng COALESCE và LEFT JOIN để lấy thông tin POI kèm bản dịch trong 1 câu query duy nhất
            const query = `
                SELECT 
                    p.*, 
                    pt.name, 
                    pt.description, 
                    pt.audio_url,
                    l.code as language_code
                FROM pois p
                LEFT JOIN poi_translations pt ON p.id = pt.poi_id
                LEFT JOIN languages l ON pt.language_id = l.id
                WHERE p.id = $1 AND (l.code = $2 OR l.code = 'vi-VN')
                ORDER BY (l.code = $2) DESC -- Ưu tiên ngôn ngữ được chọn lên đầu
                LIMIT 1;
            `;

            const result = await pool.query(query, [id, lang || 'vi-VN']);

            if (result.rows.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy địa điểm hoặc bản dịch phù hợp" });
            }

            res.json(result.rows[0]);
        } catch (err) {
            console.error("Error in getById:", err.message);
            res.status(500).json({ error: err.message });
        }
    },
    // 4. CREATE: Tạo POI mới
    create: async (req, res) => {
        // 1. Lấy thông tin từ Body và Token
        // Không lấy owner_id từ body để tránh việc user giả mạo ID người khác
        let { latitude, longitude, category, translations } = req.body;        const userIdFromToken = req.user.id; 
        const userRole = req.user.role;

        try {
            if (typeof translations === 'string') {
                translations = JSON.parse(translations);
                console.log("Received Create POI Request:", translations);
            }
        } catch (e) {
            console.error("Error parsing translations:", e.message);
            return res.status(400).json({ success: false, message: "Dữ liệu translations không đúng định dạng JSON." });
        }
        // ------------------------

        // Kiểm tra xem translations có phải là mảng không sau khi parse
        if (!Array.isArray(translations)) {
            return res.status(400).json({ success: false, message: "translations phải là một mảng." });
        }


        let thumbnailUrl = null;
        if (req.file) {
            thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;
        }

        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            // 2. Xác định owner_id thực tế
            // Nếu là admin và có truyền owner_id trong body thì ưu tiên (để admin tạo hộ user)
            // Nếu là owner thông thường, bắt buộc dùng ID từ token của chính họ
            let finalOwnerId = userIdFromToken;
            if (userRole === 'admin' && req.body.owner_id) {
                finalOwnerId = req.body.owner_id;
            }

            // 3. Insert POI gốc
            const poiRes = await client.query(`
                INSERT INTO pois (id, latitude, longitude, category, owner_id, thumbnail_url)
                VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5) RETURNING id
            `, [latitude, longitude, category, finalOwnerId, thumbnailUrl]);
            
            const poiId = poiRes.rows[0].id;

            // 4. Xử lý bản dịch tiếng Việt làm gốc
            // Dùng ILIKE để tránh lỗi chữ hoa chữ thường 'vi-vn' vs 'vi-VN'
            const viTrans = translations.find(t => t.language_code?.toLowerCase().startsWith('vi'));
            if (!viTrans) {
                throw new Error("Phải cung cấp bản dịch tiếng Việt (vi-VN) làm ngôn ngữ gốc.");
            }

            const viLangRes = await client.query("SELECT id FROM languages WHERE code ILIKE 'vi%' LIMIT 1");
            if (viLangRes.rows.length === 0) {
                throw new Error("Ngôn ngữ tiếng Việt chưa được cấu hình trong hệ thống.");
            }
            const viLangId = viLangRes.rows[0].id;

            // 5. Lưu bản dịch tiếng Việt
            await client.query(`
                INSERT INTO poi_translations (id, poi_id, language_id, name, description)
                VALUES (uuid_generate_v4(), $1, $2, $3, $4)
            `, [poiId, viLangId, viTrans.name, viTrans.description]);

            // 6. Tự động dịch sang tất cả các ngôn ngữ đang Active khác
            const otherLangs = await client.query(
                "SELECT id, code FROM languages WHERE id != $1 AND is_active = true", 
                [viLangId]
            );

            for (const lang of otherLangs.rows) {
                try {
                    const translated = await translationService.translatePoi(viTrans, lang.code);
                    await client.query(`
                        INSERT INTO poi_translations (id, poi_id, language_id, name, description)
                        VALUES (uuid_generate_v4(), $1, $2, $3, $4)
                    `, [poiId, lang.id, translated.name, translated.description]);
                } catch (transErr) {
                    console.error(`⚠️ Lỗi dịch tự động cho ngôn ngữ ${lang.code}:`, transErr.message);
                    // Vẫn tiếp tục các ngôn ngữ khác nếu một cái lỗi
                }
            }

            await client.query("COMMIT");
            res.status(201).json({ success: true, id: poiId, owner_id: finalOwnerId });

        } catch (err) {
            await client.query("ROLLBACK");
            res.status(500).json({ success: false, error: err.message });
        } finally { 
            client.release(); 
        }
    },

    // 5. UPDATE: Cập nhật POI và bản dịch (Sử dụng UPSERT)
    update: async (req, res) => {
        const { id } = req.params;
        let { latitude, longitude, category, translations } = req.body;
        const client = await pool.connect();

        try {
            // 1. Parse translations nếu gửi từ FormData
            if (typeof translations === 'string') {
                translations = JSON.parse(translations);
            }

            await client.query("BEGIN");

            // 2. Xử lý logic Thumbnail
            let finalThumbnailUrl = req.body.thumbnail_url; // Giữ URL cũ mặc định

            if (req.file) {
                // Nếu có upload file mới:
                // Lấy thông tin ảnh cũ để xóa khỏi folder (Optional nhưng nên làm)
                const oldPoi = await client.query(`SELECT thumbnail_url FROM pois WHERE id = $1`, [id]);
                const oldPath = oldPoi.rows[0]?.thumbnail_url;
                
                // Cập nhật đường dẫn mới
                finalThumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;

                // Xóa file cũ nếu nó tồn tại trên server
                if (oldPath && oldPath.startsWith('/uploads')) {
                    const fs = require('fs');
                    const path = require('path');
                    const absolutePath = path.join(__dirname, '..', oldPath); 
                    if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
                }
            }

            // 3. Cập nhật bảng POIs
            await client.query(`
                UPDATE pois 
                SET latitude=$1, longitude=$2, category=$3, thumbnail_url=$4 
                WHERE id=$5
            `, [latitude, longitude, category, finalThumbnailUrl, id]);

            // 4. Cập nhật bản dịch (UPSERT)
            if (translations && Array.isArray(translations)) {
                for (const t of translations) {
                    const lang = await client.query(`SELECT id FROM languages WHERE code = $1`, [t.language_code]);
                    if (lang.rows.length > 0) {
                        await client.query(`
                            INSERT INTO poi_translations (id, poi_id, language_id, name, description)
                            VALUES (uuid_generate_v4(), $1, $2, $3, $4)
                            ON CONFLICT (poi_id, language_id) 
                            DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description
                        `, [id, lang.rows[0].id, t.name, t.description]);
                    }
                }
            }

            await client.query("COMMIT");
            res.json({ success: true, message: "Updated successfully", thumbnail_url: finalThumbnailUrl });
        } catch (err) {
            await client.query("ROLLBACK");
            console.log("❌ Lỗi Update POI:", err.message);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    },

    // 6. DELETE: Xóa POI
    delete: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(`DELETE FROM pois WHERE id = $1 RETURNING id`, [id]);
            if (!result.rows.length) return res.status(404).json({ message: "POI not found" });
            res.json({ message: "Deleted" });
        } catch (err) { res.status(500).json({ error: err.message }); }
    },

    // 7. SYNC AUDIO: Chỉ tạo audio cho những bản dịch còn thiếu
    syncAudioById: async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            const missing = await client.query(`
                SELECT pt.id, pt.description, l.code as lang_code
                FROM poi_translations pt
                JOIN languages l ON pt.language_id = l.id
                WHERE pt.poi_id = $1 AND (pt.audio_url IS NULL OR pt.audio_url = '')
            `, [id]);

            for (const row of missing.rows) {
                if (!row.description) continue;
                const path = await audioService.generateAndSave(row.description, row.lang_code, id);
                await client.query("UPDATE poi_translations SET audio_url = $1 WHERE id = $2", [path, row.id]);
            }
            res.json({ success: true, count: missing.rows.length });
        } catch (err) { res.status(500).json({ error: err.message }); }
        finally { client.release(); }
    },

    // 8. REBUILD AUDIO: Xóa cũ tạo lại toàn bộ cho POI này
    rebuildAudioById: async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const rows = await client.query(`
                SELECT pt.id, pt.audio_url, pt.description, l.code as lang_code
                FROM poi_translations pt 
                JOIN languages l ON pt.language_id = l.id 
                WHERE pt.poi_id = $1
            `, [id]);

            for (const row of rows.rows) {
                if (row.audio_url) {
                    // SỬA: Dùng 'path.resolve' (vì bạn require là path)
                    const fullPath = path.resolve(__dirname, "../../public", row.audio_url.replace(/^\//, ""));
                    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                }
                
                if (row.description) {
                    // SỬA: Đổi tên biến từ 'path' thành 'newAudioPath' để tránh trùng với module path
                    const newAudioPath = await audioService.generateAndSave(row.description, row.lang_code, id);
                    await client.query("UPDATE poi_translations SET audio_url = $1 WHERE id = $2", [newAudioPath, row.id]);
                }
            }
            await client.query("COMMIT");
            res.json({ success: true });
        } catch (err) {
            await client.query("ROLLBACK");
            res.status(500).json({ error: err.message });
        } finally { client.release(); }
    },

    // 9. TRANSLATE FULL: Tự động dịch sang tất cả ngôn ngữ active còn thiếu
    translateFull: async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();
        
        try {
            await client.query("BEGIN");

            // 1. Lấy bản dịch gốc (Tiếng Việt) để làm căn cứ dịch
            const originRes = await client.query(`
                SELECT pt.* FROM poi_translations pt
                JOIN languages l ON pt.language_id = l.id
                WHERE pt.poi_id = $1 AND l.code = 'vi-VN'
            `, [id]);

            if (originRes.rows.length === 0) {
                return res.status(400).json({ error: "Phải có bản dịch tiếng Việt trước khi dịch tự động." });
            }
            const viTrans = originRes.rows[0];

            // 2. Lấy danh sách tất cả ngôn ngữ đang active (trừ tiếng Việt)
            const langRes = await client.query("SELECT id, code FROM languages WHERE is_active = TRUE AND code != 'vi-VN'");
            
            const results = [];

            // 3. Vòng lặp dịch và Upsert (Insert hoặc Update nếu đã tồn tại)
            for (const lang of langRes.rows) {
                // Gọi service dịch (Google Translate API / LibreTranslate ...)
                const translated = await translationService.translatePoi(viTrans, lang.code);

                const upsertQuery = `
                    INSERT INTO poi_translations (poi_id, language_id, name, description)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (poi_id, language_id) 
                    DO UPDATE SET 
                        name = EXCLUDED.name, 
                        description = EXCLUDED.description
                    RETURNING *;
                `;
                
                const saved = await client.query(upsertQuery, [
                    id, 
                    lang.id, 
                    translated.name, 
                    translated.description
                ]);
                results.push(saved.rows[0]);
            }

            await client.query("COMMIT");
            res.json({ success: true, translated_count: results.length });

        } catch (err) {
            await client.query("ROLLBACK");
            console.error("Translation Error:", err);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    },

    // Xóa 1 audio của 1 bản dịch cụ thể trong 1 POI
    deleteAudio: async (req, res) => {
        const { id: poiId, translationId } = req.params;
        if (!translationId) {
            return res.status(400).json({ error: "Thiếu translationId" });
        }

        const client = await pool.connect();
        try {
            const transRes = await client.query(
                `SELECT audio_url FROM poi_translations WHERE id = $1 AND poi_id = $2`,
                [translationId, poiId]
            );
            if (transRes.rows.length === 0) {
                return res.status(404).json({ error: "Không tìm thấy bản dịch thuộc POI này" });
            }
            const { audio_url } = transRes.rows[0];
            if (audio_url) {
                const fullPath = path.resolve(__dirname, "../../public", audio_url.replace(/^\//, ""));
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
            await client.query(
                `UPDATE poi_translations SET audio_url = NULL WHERE id = $1 AND poi_id = $2`,
                [translationId, poiId]
            );

            res.json({ success: true, message: "Đã xóa audio của 1 bản dịch" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    }
};

module.exports = poiController;