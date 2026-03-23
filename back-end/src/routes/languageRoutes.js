// routes/LanguageRoutes.js
const express = require('express');
const router = express.Router();
const LanguageController = require('../controllers/languageController');
const authMiddleware = require('../middlewares/authMiddleware');

/** * --- NHÓM API CHO CLIENT (PUBLIC) ---
 * Dùng để hiển thị menu chọn ngôn ngữ trên bản đồ
 */

// Lấy danh sách các ngôn ngữ đang được bật (is_active = true)
// Ví dụ: Chỉ trả về Việt, Anh, Nhật
router.get('/active', LanguageController.getActiveLanguages);

// Lấy thông tin chi tiết một ngôn ngữ theo mã (ví dụ: /vi-VN)
router.get('/code/:code', LanguageController.getByCode);


/** * --- NHÓM API CHO ADMIN ---
 */

// Lấy tất cả ngôn ngữ trong hệ thống (kể cả đang tắt)
router.get('/admin/all', authMiddleware.authMiddleware,LanguageController.getAdminAll);

// Thêm một ngôn ngữ mới vào danh sách 50 cái có sẵn
router.post('/', LanguageController.create); 

// Cập nhật thông tin chung (Tên, Mã)
router.put('/:id', authMiddleware.authMiddleware, LanguageController.update);

// API đặc biệt: Chỉ để bật/tắt nhanh trạng thái is_active
// Body: { "is_active": true/false }
router.patch('/:id/status', authMiddleware.authMiddleware, LanguageController.toggleStatus);

router.post('/:id/sync-audio', authMiddleware.authMiddleware, LanguageController.syncAudioByLanguage);
router.post('/:id/sync-translate', authMiddleware.authMiddleware, LanguageController.syncTranslateByLanguage);

module.exports = router;