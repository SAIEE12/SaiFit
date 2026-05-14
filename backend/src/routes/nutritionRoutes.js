const express = require('express');
const router = express.Router();
const nutritionController = require('../controllers/nutritionController');
const authenticateToken = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Auth middleware included but bypassable for dev in authMiddleware.js
router.use(authenticateToken);

router.post('/analyze/image', upload.single('image'), nutritionController.analyzeFoodImage);
router.post('/analyze/text', nutritionController.analyzeFoodText);
router.post('/log', nutritionController.logFood);

module.exports = router;
