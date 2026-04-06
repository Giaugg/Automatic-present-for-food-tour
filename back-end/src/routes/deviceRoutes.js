const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

router.post('/identify', deviceController.identify);

module.exports = router;
