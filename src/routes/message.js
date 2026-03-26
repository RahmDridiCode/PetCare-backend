const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { sendMessage, getConversation, getUsers, getUnreadTotal } = require('../controllers/messageController');

const router = express.Router();

router.post('/send', authenticate, sendMessage);
router.get('/conversation/:userId', authenticate, getConversation);
router.get('/users', authenticate, getUsers);
router.get('/unread-count', authenticate, getUnreadTotal);

module.exports = router;
