const express = require('express');
const router = express.Router();
const poiController = require('../controllers/poiController');

// Import middleware hợp nhất
const { authMiddleware, authorize } = require('../middlewares/authMiddleware');

// --- 1. PUBLIC ROUTES (Dành cho người dùng App/Bản đồ) ---

// Lấy danh sách POI kèm ngôn ngữ (Ví dụ: /api/pois?lang=vi)
router.get('/', poiController.getAllPOIs); 

// Chi tiết 1 quán (Tất cả ngôn ngữ + danh sách ảnh poi_images)
router.get('/:id', poiController.getPOIDetails); 


// --- 2. PROTECTED ROUTES (Cần đăng nhập & Phân quyền) ---

// Thêm mới một địa điểm (Chỉ Admin hoặc Chủ quán mới được tạo)
router.post('/', 
    authMiddleware, 
    authorize('admin', 'owner'), 
    poiController.createPOI
); 

// Cập nhật thông tin địa điểm (Tọa độ, Bán kính, Bản dịch)
router.put('/:id', 
    authMiddleware, 
    authorize('admin', 'owner'), 
    poiController.updatePOI
); 

// Xóa địa điểm
// Lưu ý: CASCADE trong DB sẽ tự động dọn dẹp các bảng con (poi_translations, poi_images, tour_items)
router.delete('/:id', 
    authMiddleware, 
    authorize('admin'), // Thường chỉ Admin mới có quyền xóa vĩnh viễn dữ liệu
    poiController.deletePOI
); 

module.exports = router;