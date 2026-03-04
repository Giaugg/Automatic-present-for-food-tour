const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, authorize } = require('../middlewares/authMiddleware');

/**
 * Prefix của file này trong app.js: /api/admin/users
 */

// 1. Lấy danh sách tất cả người dùng (Hỗ trợ lọc ?role=...&search=...)
// GET /api/admin/users
router.get(
    '/', 
    authMiddleware, 
    authorize('admin'), 
    userController.getAllUsers
);

// 2. Lấy chi tiết một người dùng theo ID
// GET /api/admin/users/:id
router.get(
    '/:id', 
    authMiddleware, 
    authorize('admin'), 
    userController.getUserById
);

// 3. Cập nhật thông tin/vai trò/số dư/điểm của người dùng
// PUT /api/admin/users/:id
router.put(
    '/:id', 
    authMiddleware, 
    authorize('admin'), 
    userController.updateUser
);

// 4. Admin nạp tiền hộ cho người dùng (Top-up)
// POST /api/admin/users/:id/topup
router.post(
    '/:id/topup', 
    authMiddleware, 
    authorize('admin'), 
    userController.adminTopUp
);

// 5. Xóa vĩnh viễn tài khoản người dùng
// DELETE /api/admin/users/:id
router.delete(
    '/:id', 
    authMiddleware, 
    authorize('admin'), 
    userController.deleteUser
);

module.exports = router;