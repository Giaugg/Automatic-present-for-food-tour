const express = require('express');
const router = express.Router();
const poiController = require('../controllers/poiController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
// ================= PUBLIC ROUTES =================

/**
 * @route   GET /api/pois
 * @desc    Lấy danh sách POI (?lang=vi-VN)
 */

/**
 * 🔥 QUAN TRỌNG: Lấy POI gần user
 * @route   GET /api/pois/nearby?lat=...&lng=...&radius=100
*/
router.get('/nearby', poiController.getNearby);

router.get('/my-pois', authMiddleware.authMiddleware, poiController.getMyPois);
/**
 * @route   GET /api/pois/:id
 * @desc    Chi tiết POI
*/
router.get('/', poiController.getAll);
router.get('/:id', poiController.getById);

router.get('/:id/details', poiController.getDetails);

// ================= ADMIN ROUTES =================

/**
 * @route   POST /api/pois
 */
router.post('/', authMiddleware.authMiddleware, upload.single('thumbnail'), poiController.create);

/**
 * @route   PUT /api/pois/:id
 */
router.put('/:id', authMiddleware.authMiddleware, upload.single('thumbnail'), poiController.update);

/**
 * @route   DELETE /api/pois/:id
 */
router.delete('/:id', authMiddleware.authMiddleware, poiController.delete);



router.post('/:id/sync-audio', authMiddleware.authMiddleware, poiController.syncAudioById);
router.post('/:id/rebuild-audio', authMiddleware.authMiddleware, poiController.rebuildAudioById);
module.exports = router;