const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.post('/log', activityController.logActivity);
router.get('/', activityController.getActivities);
router.delete('/:id', activityController.deleteActivity);

module.exports = router;
