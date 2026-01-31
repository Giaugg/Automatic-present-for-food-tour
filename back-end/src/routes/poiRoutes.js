const express = require('express');
const router = express.Router();
const poiController = require('../controllers/poiController');

router.get('/', poiController.getAllPOIs);
router.get('/:id', poiController.getPOIDetails);
// Thêm các router POST, PUT dành cho Admin/Owner tại đây

module.exports = router;