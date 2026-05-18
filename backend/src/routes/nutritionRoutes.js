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
router.post('/smart-search', nutritionController.smartSearch);
router.get('/smart-search/status', nutritionController.getSmartSearchStatus);
router.get('/meals', nutritionController.getMeals);
router.delete('/log/:id', nutritionController.deleteMealLog);




module.exports = router;
