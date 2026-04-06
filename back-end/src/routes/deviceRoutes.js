const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Endpoint ghi nhận thiết bị khi người dùng truy cập web/app.
router.post('/identify', deviceController.identify);

module.exports = router;
