const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);

module.exports = router;
