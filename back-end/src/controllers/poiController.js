const pool = require('../config/db');

exports.getAllPOIs = async (req, res) => {
    const { lang = 'en' } = req.query; // Mặc định lấy tiếng Anh
    try {
        const result = await pool.query(`
            SELECT p.*, pt.name, pt.description, pt.audio_url 
            FROM pois p
            LEFT JOIN poi_translations pt ON p.id = pt.poi_id AND pt.language_code = $1
            WHERE p.status = TRUE`, [lang]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPOIDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const poi = await pool.query('SELECT * FROM pois WHERE id = $1', [id]);
        const translations = await pool.query('SELECT * FROM poi_translations WHERE poi_id = $1', [id]);
        const images = await pool.query('SELECT * FROM poi_images WHERE poi_id = $1 ORDER BY display_order', [id]);
        
        if (poi.rows.length === 0) return res.status(404).json({ message: "POI not found" });

        res.json({
            ...poi.rows[0],
            translations: translations.rows,
            images: images.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};