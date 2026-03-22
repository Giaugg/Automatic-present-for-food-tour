const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const systemController = {
    checkAudioFiles: async (req, res) => {
        try {
            // 1. Lấy tất cả audio_url từ DB
            const dbRes = await pool.query('SELECT poi_id, language_id, audio_url FROM poi_translations WHERE audio_url IS NOT NULL');
            const audioDir = path.join(__dirname, '../../public/uploads/audio');

            const report = dbRes.rows.map(row => {
                // Chuyển đổi URL thành đường dẫn vật lý
                // Giả sử URL dạng: /uploads/audio/poi_1_vi-VN.mp3
                const fileName = path.basename(row.audio_url);
                const filePath = path.join(audioDir, fileName);
                
                return {
                    poi_id: row.poi_id,
                    language_code: row.language_id, // Hoặc code tùy DB của bạn
                    url: row.audio_url,
                    exists: fs.existsSync(filePath),
                    size: fs.existsSync(filePath) ? `${(fs.statSync(filePath).size / 1024).toFixed(2)} KB` : 0
                };
            });

            res.json({
                success: true,
                total_in_db: dbRes.rowCount,
                missing_files: report.filter(f => !f.exists).length,
                details: report
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = systemController;