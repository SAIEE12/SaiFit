const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.post('/log', workoutController.logWorkout);
router.get('/', workoutController.getWorkouts);

module.exports = router;
