const express = require('express');
const router = express.Router();
const onlineDeviceController = require('../controllers/onlineDeviceController');
const { authMiddleware, authorize } = require('../middlewares/authMiddleware');

/**
 * Online Device Routes
 */

// User: Tạo session mới khi login
router.post('/session/create', authMiddleware, onlineDeviceController.createSession);

// User: Update activity (heartbeat)
router.post('/session/activity', authMiddleware, onlineDeviceController.updateActivity);

// User: Kết thúc session khi logout
router.post('/end-session/:session_id', authMiddleware, onlineDeviceController.endSession);

// User: Lấy session của chính mình
router.get('/my-sessions', authMiddleware, onlineDeviceController.getMySession);

// Admin: Lấy danh sách tất cả thiết bị đang online
router.get('/active-devices', authMiddleware, authorize('admin'), onlineDeviceController.getOnlineDevices);

// Admin: Lấy thống kê thiết bị online
router.get('/stats', authMiddleware, authorize('admin'), onlineDeviceController.getOnlineDevicesStats);

// Admin: Kick out session (remove user)
router.post('/kick-session/:session_id', authMiddleware, authorize('admin'), onlineDeviceController.kickOutSession);

module.exports = router;
