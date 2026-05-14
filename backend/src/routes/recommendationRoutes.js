const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/', recommendationController.getRecommendations);

module.exports = router;
