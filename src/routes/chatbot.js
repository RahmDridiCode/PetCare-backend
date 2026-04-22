const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { sendMessage, history } = require('../controllers/chatbotController');

// POST /api/chatbot
router.post('/', authenticate, sendMessage);

// GET /api/chatbot/history
router.get('/history', authenticate, history);

module.exports = router;
