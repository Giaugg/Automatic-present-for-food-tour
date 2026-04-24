const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authMiddleware, authorize } = require('../middlewares/authMiddleware');

// Endpoint ghi nhận thiết bị khi người dùng truy cập web/app.
router.post('/identify', deviceController.identify);

// Admin xem log thiết bị gần nhất để kiểm tra tính năng hoạt động.
router.get('/logs', authMiddleware, authorize('admin'), deviceController.getRecentLogs);

// Admin xem thống kê chi tiết thiết bị (theo loại, browser, OS...)
router.get('/stats', authMiddleware, authorize('admin'), deviceController.getDeviceStats);

// Admin xem thống kê realtime (1h, 24h, top devices...)
router.get('/realtime', authMiddleware, authorize('admin'), deviceController.getRealtimeStats);

// Admin xem xu hướng theo giờ trong 24h qua
router.get('/trend/hourly', authMiddleware, authorize('admin'), deviceController.getHourlyTrend);

module.exports = router;
