const pool = require('../config/db');

const dashboardController = {
  // --- THỐNG KÊ CHO ADMIN (TỔNG QUAN HỆ THỐNG) ---
  getAdminStats: async (req, res) => {
    const client = await pool.connect();
    try {
      // Sử dụng Promise.all để chạy song song các câu query cho nhanh
      const [totalUsers, totalPois, totalLangs, recentPois] = await Promise.all([
        client.query("SELECT COUNT(*) FROM users"),
        client.query("SELECT COUNT(*) FROM pois"),
        client.query("SELECT COUNT(*) FROM languages WHERE is_active = true"),
        client.query(`
          SELECT p.id, p.category, p.created_at, pt.name 
          FROM pois p 
          LEFT JOIN poi_translations pt ON p.id = pt.poi_id 
          AND pt.language_id = (SELECT id FROM languages WHERE code = 'vi-VN' LIMIT 1)
          ORDER BY p.created_at DESC LIMIT 5
        `)
      ]);

      res.json({
        success: true,
        data: {
          counters: {
            users: parseInt(totalUsers.rows[0].count),
            pois: parseInt(totalPois.rows[0].count),
            activeLanguages: parseInt(totalLangs.rows[0].count),
          },
          recentPois: recentPois.rows
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    } finally {
      client.release();
    }
  },

  // --- THỐNG KÊ CHO OWNER (CHỈ LẤY DỮ LIỆU CỦA HỌ) ---
  getOwnerStats: async (req, res) => {
    const userId = req.user.id; // Lấy từ token qua middleware
    const client = await pool.connect();
    try {
      // 1. Đếm số POI sở hữu
      // 2. Thống kê số lượng POI theo Category (Ẩm thực, Kiến trúc...)
      // 3. Kiểm tra xem có bao nhiêu POI chưa được dịch đủ các ngôn ngữ active
      const [myPoisCount, categoryStats, translationStatus] = await Promise.all([
        client.query("SELECT COUNT(*) FROM pois WHERE owner_id = $1", [userId]),
        
        client.query(`
          SELECT category, COUNT(*) 
          FROM pois 
          WHERE owner_id = $1 
          GROUP BY category
        `, [userId]),

        client.query(`
          SELECT 
            p.id, 
            pt.name,
            (SELECT COUNT(*) FROM languages WHERE is_active = true) as total_active_langs,
            (SELECT COUNT(*) FROM poi_translations WHERE poi_id = p.id) as translated_langs
          FROM pois p
          LEFT JOIN poi_translations pt ON p.id = pt.poi_id 
          AND pt.language_id = (SELECT id FROM languages WHERE code = 'vi-VN' LIMIT 1)
          WHERE p.owner_id = $1
        `, [userId])
      ]);

      res.json({
        success: true,
        data: {
          totalPois: parseInt(myPoisCount.rows[0].count),
          categories: categoryStats.rows,
          translationHealth: translationStatus.rows.map(row => ({
            name: row.name,
            isComplete: row.total_active_langs <= row.translated_langs,
            missing: Math.max(0, row.total_active_langs - row.translated_langs)
          }))
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    } finally {
      client.release();
    }
  }
};

module.exports = dashboardController;