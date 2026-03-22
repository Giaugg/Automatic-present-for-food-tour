const express = require('express');
const router = express.Router();
const poiController = require('../controllers/poiController');

// ================= PUBLIC ROUTES =================

/**
 * @route   GET /api/pois
 * @desc    Lấy danh sách POI (?lang=vi-VN)
 */
router.get('/', poiController.getAll);

/**
 * 🔥 QUAN TRỌNG: Lấy POI gần user
 * @route   GET /api/pois/nearby?lat=...&lng=...&radius=100
 */
router.get('/nearby', poiController.getNearby);

/**
 * @route   GET /api/pois/:id
 * @desc    Chi tiết POI
 */
router.get('/:id', poiController.getById);

router.get('/:id/details', poiController.getDetails);


// ================= ADMIN ROUTES =================

/**
 * @route   POST /api/pois
 */
router.post('/', poiController.create);

/**
 * @route   PUT /api/pois/:id
 */
router.put('/:id', poiController.update);

/**
 * @route   DELETE /api/pois/:id
 */
router.delete('/:id', poiController.delete);



router.post('/:id/sync-audio', poiController.syncAudioById);
router.post('/:id/rebuild-audio', poiController.rebuildAudioById);
module.exports = router;