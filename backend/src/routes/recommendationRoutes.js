const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const authenticateToken = require('../middlewares/authMiddleware');
const { checkAiUsageLimit } = require('../middlewares/usageMiddleware');

router.use(authenticateToken);

router.get('/', checkAiUsageLimit, recommendationController.getRecommendations);
router.get('/insight', checkAiUsageLimit, recommendationController.getInsight);
router.get('/workout-coach', checkAiUsageLimit, recommendationController.getWorkoutCoach);
router.get('/calendar-coach', checkAiUsageLimit, recommendationController.getCalendarCoach);
router.get('/profile-coach', checkAiUsageLimit, recommendationController.getProfileCoach);
router.get('/achievements', recommendationController.getAchievements);

module.exports = router;
