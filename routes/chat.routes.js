const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead
} = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/send', sendMessage);
router.get('/:userId', getMessages);
router.get('/conversations/all', getConversations);
router.put('/read/:userId', markAsRead);

module.exports = router;