const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticateToken = require('../middlewares/authMiddleware');
const { checkAiUsageLimit } = require('../middlewares/usageMiddleware');

router.use(authenticateToken);

router.get('/history', chatController.getChatHistory);
router.post('/send', checkAiUsageLimit, chatController.sendMessageStream);
router.post('/clear', chatController.clearChatHistory);

module.exports = router;
