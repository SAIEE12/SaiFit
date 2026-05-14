const express = require('express');
const router = express.Router();
const nutritionController = require('../controllers/nutritionController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.post('/analyze', nutritionController.analyzeFoodImage);
router.post('/log', nutritionController.logFood);

module.exports = router;
