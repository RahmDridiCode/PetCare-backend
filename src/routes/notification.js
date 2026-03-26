const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { getNotifications, markAsRead, getUnreadCount, markAllRead } = require('../controllers/notificationController');

router.get('/', authenticate, getNotifications);
router.put('/:id/read', authenticate, markAsRead);
router.put('/read-all', authenticate, markAllRead);
router.get('/unread-count', authenticate, getUnreadCount);

module.exports = router;
