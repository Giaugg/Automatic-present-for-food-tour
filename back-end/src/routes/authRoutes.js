const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middlewares/rateLimitMiddleware');

// Import middleware đã hợp nhất (Sử dụng destructuring)
const { authMiddleware } = require('../middlewares/authMiddleware');

// --- CÁC ROUTE CÔNG KHAI (PUBLIC) ---

// Đăng ký tài khoản mới (Mặc định là 'visitor')
router.post('/register', authLimiter, authController.register);

// Đăng nhập để nhận JWT Token
router.post('/login', authLimiter, authController.login);

// --- CÁC ROUTE CẦN XÁC THỰC (PROTECTED) ---

// Lấy thông tin cá nhân của người dùng đang đăng nhập
// Middleware sẽ gán thông tin user vào req.user trước khi vào controller
router.get('/me', authMiddleware, authController.getMe);

// User tự nạp tiền vào ví
router.post('/topup', authMiddleware, authController.topUpBalance);

// User xem lịch sử giao dịch ví
router.get('/wallet-transactions', authMiddleware, authController.getMyWalletTransactions);

module.exports = router;