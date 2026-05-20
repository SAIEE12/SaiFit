const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/', recommendationController.getRecommendations);
router.get('/insight', recommendationController.getInsight);
router.get('/workout-coach', recommendationController.getWorkoutCoach);
router.get('/calendar-coach', recommendationController.getCalendarCoach);
router.get('/profile-coach', recommendationController.getProfileCoach);

module.exports = router;
