const pool = require("../config/db");
const audioService = require("../services/audioService");
const translationService = require("../services/translationService");

const LanguageController = {
	// 1. Lấy danh sách ngôn ngữ đang bật (Dành cho Client/Map)
	getActiveLanguages: async (req, res) => {
		try {
			const result = await pool.query(
				"SELECT id, code, name FROM languages WHERE is_active = true ORDER BY name ASC",
			);
			res.json({ success: true, data: result.rows });
		} catch (err) {
			res.status(500).json({ success: false, message: err.message });
		}
	},

	// 2. Lấy toàn bộ danh sách 50 ngôn ngữ (Dành cho Admin)
	getAdminAll: async (req, res) => {
		try {
			const result = await pool.query(
				"SELECT * FROM languages ORDER BY name ASC",
			);
			res.json({ success: true, data: result.rows });
		} catch (err) {
			res.status(500).json({ success: false, message: err.message });
		}
	},

	// 3. Lấy theo code (ví dụ: vi-VN)
	getByCode: async (req, res) => {
		const { code } = req.params;
		try {
			const result = await pool.query(
				"SELECT * FROM languages WHERE code = $1",
				[code],
			);
			if (result.rows.length === 0)
				return res.status(404).json({ message: "Not found" });
			res.json({ success: true, data: result.rows[0] });
		} catch (err) {
			res.status(500).json({ success: false, message: err.message });
		}
	},

	// 4. Tạo mới
	create: async (req, res) => {
		const { code, name, is_active } = req.body;
		try {
			const result = await pool.query(
				"INSERT INTO languages (code, name, is_active) VALUES ($1, $2, $3) RETURNING *",
				[code, name, is_active || false],
			);
			res.status(201).json({ success: true, data: result.rows[0] });
		} catch (err) {
			res.status(400).json({ success: false, message: err.message });
		}
	},

	// 5. Cập nhật chung
	update: async (req, res) => {
		const { id } = req.params; // Đây nên là UUID từ Frontend
		const { code, name, is_active } = req.body;
		try {
			const result = await pool.query(
				`UPDATE languages 
        SET code = COALESCE($1, code), 
            name = COALESCE($2, name), 
            is_active = $3 
        WHERE id = $4 RETURNING *`, // Dùng WHERE id thay vì WHERE code
				[code, name, is_active, id],
			);

			if (result.rowCount === 0) {
				return res
					.status(404)
					.json({ success: false, message: "Không tìm thấy ngôn ngữ" });
			}

			res.json({ success: true, data: result.rows[0] });
		} catch (err) {
			res.status(400).json({ success: false, message: err.message });
		}
	},

	// 6. Bật/Tắt trạng thái (PATCH)
	toggleStatus: async (req, res) => {
		const { id } = req.params;
		const { is_active } = req.body;
		try {
			const result = await pool.query(
				"UPDATE languages SET is_active = $1 WHERE id = $2 RETURNING *",
				[is_active, id],
			);
			res.json({ success: true, data: result.rows[0] });
		} catch (err) {
			console.log("Lỗi toggleStatus:", err.message);
			res.status(400).json({ success: false, message: err.message });
		}
	},

	syncAudioByLanguage: async (req, res) => {
		const { id } = req.params; // ID của ngôn ngữ (UUID)
		const client = await pool.connect();

		let successCount = 0;
		let skipCount = 0;
		let errorCount = 0;

		try {
			// 1. Lấy thông tin ngôn ngữ (để lấy code phục vụ TTS)
			const langResult = await client.query(
				"SELECT code FROM languages WHERE id = $1",
				[id],
			);
			if (langResult.rows.length === 0) {
				return res
					.status(404)
					.json({ success: false, message: "Không tìm thấy ngôn ngữ" });
			}
			const langCode = langResult.rows[0].code;

			// 2. Tìm các bản dịch của ngôn ngữ này chưa có audio_url nhưng có description
			const translations = await client.query(
				`
          SELECT pt.id, pt.poi_id, pt.description 
          FROM poi_translations pt
          WHERE pt.language_id = $1 
          AND (pt.audio_url IS NULL OR pt.audio_url = '')
          AND pt.description IS NOT NULL 
          AND pt.description != ''
        `,
				[id],
			);

			if (translations.rows.length === 0) {
				return res.json({
					success: true,
					message: "Không có bản dịch nào cần tạo Audio.",
				});
			}

			// 3. Lặp qua và tạo Audio
			for (const trans of translations.rows) {
				try {
					const publicPath = await audioService.generateAndSave(
						trans.description,
						langCode,
						trans.poi_id,
					);

					await client.query(
						"UPDATE poi_translations SET audio_url = $1 WHERE id = $2",
						[publicPath, trans.id],
					);
					successCount++;
				} catch (err) {
					console.error(`Lỗi tạo Audio cho POI ${trans.poi_id}:`, err.message);
					errorCount++;
				}
			}

			res.json({
				success: true,
				data: {
					total_found: translations.rowCount,
					success: successCount,
					failed: errorCount,
				},
			});
		} catch (err) {
			console.error("Lỗi Sync Audio:", err);
			res.status(500).json({ success: false, message: err.message });
		} finally {
			client.release();
		}
	},

	syncTranslateByLanguage: async (req, res) => {
		const { id } = req.params; // Đây là ID của ngôn ngữ đích (UUID)
		const client = await pool.connect();

		let successCount = 0;
		let errorCount = 0;

		try {
			// Bước 1: Lấy code của ngôn ngữ đích (để truyền vào Google Translate)
			const langResult = await client.query(
				"SELECT code FROM languages WHERE id = $1",
				[id],
			);
			if (langResult.rows.length === 0) {
				return res
					.status(404)
					.json({
						success: false,
						message: "Không tìm thấy ngôn ngữ mục tiêu",
					});
			}
			const targetLangCode = langResult.rows[0].code;

			// Bước 2: Lấy ID của tiếng Việt (vi-VN) để làm gốc
			const viLangResult = await client.query(
				"SELECT id FROM languages WHERE code = 'vi-VN' LIMIT 1",
			);
			if (viLangResult.rows.length === 0) {
				return res
					.status(400)
					.json({
						success: false,
						message: "Hệ thống chưa có tiếng Việt làm gốc",
					});
			}
			const viId = viLangResult.rows[0].id;

			// Bước 3: Tìm POI có tiếng Việt nhưng CHƯA CÓ ngôn ngữ đích
			// Lưu ý: Join dựa trên language_id vì bảng translations không có code
			const poisToTranslate = await client.query(
				`
      SELECT 
        p.id as poi_id, 
        pt_base.name, 
        pt_base.description
      FROM pois p
      JOIN poi_translations pt_base ON p.id = pt_base.poi_id AND pt_base.language_id = $1
      LEFT JOIN poi_translations pt_target ON p.id = pt_target.poi_id AND pt_target.language_id = $2
      WHERE pt_target.id IS NULL
    `,
				[viId, id],
			);

			if (poisToTranslate.rows.length === 0) {
				return res.json({
					success: true,
					message: "Tất cả địa điểm đã được dịch.",
				});
			}

			// Bước 4: Lặp và dịch
			for (const poi of poisToTranslate.rows) {
				try {
					// Sử dụng hàm translatePoi tối ưu mà bạn đã viết
					const result = await translationService.translatePoi(
						{ name: poi.name, description: poi.description },
						targetLangCode,
					);

					// Chèn vào DB (Schema của bạn không có is_auto_translated nên tôi bỏ qua)
					await client.query(
						`
          INSERT INTO poi_translations (id, poi_id, language_id, name, description) 
          VALUES (uuid_generate_v4(), $1, $2, $3, $4)
        `,
						[poi.poi_id, id, result.name, result.description],
					);

					successCount++;
					// Nghỉ 100ms để tránh Google chặn IP
					await new Promise((r) => setTimeout(r, 100));
				} catch (err) {
					console.error(`Lỗi dịch POI ${poi.poi_id}:`, err.message);
					errorCount++;
				}
			}

			res.json({
				success: true,
				message: `Đã dịch xong cho tiếng ${targetLangCode}`,
				data: {
					total: poisToTranslate.rowCount,
					success: successCount,
					failed: errorCount,
				},
			});
		} catch (err) {
			console.error("Lỗi Sync Translate:", err);
			res.status(500).json({ success: false, message: err.message });
		} finally {
			client.release();
		}
	},
};

module.exports = LanguageController;
