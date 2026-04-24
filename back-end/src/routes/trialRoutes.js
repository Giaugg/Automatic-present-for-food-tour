const express = require('express');
const router = express.Router();
const trialController = require('../controllers/trialController');
const { authMiddleware, authorize } = require('../middlewares/authMiddleware');

/**
 * Trial Account Routes
 */

// Admin: Tạo tài khoản dùng thử mới
router.post('/create', authMiddleware, authorize('admin'), trialController.createTrialAccount);

// Admin: Lấy danh sách trial accounts
router.get('/list', authMiddleware, authorize('admin'), trialController.getTrialAccounts);

// Admin: Lấy thống kê trial accounts
router.get('/stats', authMiddleware, authorize('admin'), trialController.getTrialStats);

// User: Kiểm tra trạng thái trial của chính mình
router.get('/check-status', authMiddleware, trialController.checkTrialStatus);

// Admin: Lấy chi tiết trial account của một user
router.get('/:userId', authMiddleware, authorize('admin'), trialController.getTrialAccountDetail);

// Admin: Gia hạn trial account
router.post('/:userId/extend', authMiddleware, authorize('admin'), trialController.extendTrialAccount);

// Admin: Hủy trial account
router.post('/:userId/cancel', authMiddleware, authorize('admin'), trialController.cancelTrialAccount);


module.exports = router;
