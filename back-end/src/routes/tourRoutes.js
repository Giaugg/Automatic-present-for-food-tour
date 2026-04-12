const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const upload = require('../middlewares/uploadMiddleware');

// Import middleware hợp nhất
const { authMiddleware, authorize } = require('../middlewares/authMiddleware');

// --- 1. PUBLIC ROUTES (Mọi người đều có thể xem) ---

// Lấy danh sách tất cả các tour (Có hỗ trợ query ?lang=vi hoặc ?lang=en)
router.get('/', tourController.getAllTours);

// Lấy chi tiết 1 tour cụ thể kèm lộ trình POIs (Ví dụ: /api/tours/uuid-cua-tour?lang=vi)
router.get('/:id', tourController.getTourDetails);

// --- 2. PROTECTED ROUTES (Chỉ Admin mới có quyền thay đổi dữ liệu Tour) ---

// Tạo một tour mới kèm bản dịch đa ngôn ngữ
router.post('/', 
    authMiddleware, 
    authorize('admin'), 
    tourController.createTour
);

// Cập nhật thông tin cơ bản và bản dịch của tour
router.put('/:id', 
    authMiddleware, 
    authorize('admin'), 
    tourController.updateTour
);

// Cập nhật lộ trình (Sắp xếp lại thứ tự các POI: step_order)
// Endpoint này rất quan trọng cho tính năng Reorder trên trang quản trị
router.put('/:id/schedule', 
    authMiddleware, 
    authorize('admin'), 
    tourController.updateTourSchedule
);

// Xóa hoàn toàn một tour (Hệ thống sẽ tự động xóa các tour_items liên quan nhờ ON DELETE CASCADE)
router.delete('/:id', 
    authMiddleware, 
    authorize('admin'), 
    tourController.deleteTour
);

// Upload thumbnail cho tour
router.post('/upload-thumbnail',
    authMiddleware,
    authorize('admin'),
    upload.single('thumbnail'),
    tourController.uploadTourThumbnail
);

module.exports = router;