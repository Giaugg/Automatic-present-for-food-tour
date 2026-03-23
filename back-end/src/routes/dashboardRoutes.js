const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Chỉ Admin mới vào được
router.get('/admin/stats', authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });
  next();
}, dashboardController.getAdminStats);

// Owner và Admin đều vào được (Admin xem của chính mình nếu có POI)
router.get('/owner/stats', authMiddleware, dashboardController.getOwnerStats);

module.exports = router;