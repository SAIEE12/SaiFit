const express = require('express');
const router = express.Router();
const hydrationController = require('../controllers/hydrationController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.post('/log', hydrationController.logHydration);
router.get('/', hydrationController.getHydration);

module.exports = router;
