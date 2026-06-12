const express = require('express');
const router = express.Router();
const lifestyleController = require('../controllers/lifestyleController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/tracks', lifestyleController.getTracks);
router.get('/my-tracks', lifestyleController.getMyTracks);
router.put('/my-tracks', lifestyleController.updateMyTracks);

module.exports = router;
