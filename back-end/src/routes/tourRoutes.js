const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const authMiddleware = require('../middlewares/authMiddleware'); // Middleware xác thực
// const adminMiddleware = require('../middlewares/adminMiddleware'); // Middleware kiểm tra role admin

// --- PUBLIC ROUTES (Ai cũng có thể xem) ---

// Lấy danh sách tất cả các tour (thường dùng cho trang chủ/khám phá)
router.get('/', tourController.getAllTours);

// Lấy chi tiết 1 tour cụ thể kèm danh sách các điểm dừng (POI) theo thứ tự
router.get('/:id', tourController.getTourDetails);


// --- PROTECTED ROUTES (Cần đăng nhập hoặc quyền Admin) ---

// Tạo một tour mới (Admin/Owner)
router.post('/', authMiddleware, tourController.createTour);

// Cập nhật thông tin cơ bản của tour (Tên, mô tả, ảnh thumbnail)
router.put('/:id', authMiddleware, tourController.updateTour);

// Thêm một điểm POI vào tour hoặc cập nhật thứ tự (step_order)
router.post('/:id/items', authMiddleware, tourController.addPoiToTour);

// Xóa một điểm POI khỏi tour
router.delete('/:id/items/:poi_id', authMiddleware, tourController.removePoiFromTour);

// Xóa hoàn toàn một tour
router.delete('/:id', authMiddleware, tourController.deleteTour);

module.exports = router;