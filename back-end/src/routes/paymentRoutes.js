const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Tạo đơn nạp tiền ZaloPay cho user đăng nhập.
router.post('/zalopay/topup-order', authMiddleware, paymentController.createZaloPayTopupOrder);

// User chủ động query trạng thái đơn khi vừa quay lại từ ZaloPay.
router.get('/zalopay/status/:appTransId', authMiddleware, paymentController.queryZaloPayOrderStatus);

// Callback từ ZaloPay (không cần auth user).
router.post('/zalopay/callback', paymentController.zaloPayCallback);

module.exports = router;
