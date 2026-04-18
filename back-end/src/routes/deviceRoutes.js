const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authMiddleware, authorize } = require('../middlewares/authMiddleware');

// Endpoint ghi nhận thiết bị khi người dùng truy cập web/app.
router.post('/identify', deviceController.identify);

// Admin xem log thiết bị gần nhất để kiểm tra tính năng hoạt động.
router.get('/logs', authMiddleware, authorize('admin'), deviceController.getRecentLogs);

module.exports = router;
