const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { getAllVeterinarians } = require('../controllers/userController');

const router = express.Router();

router.get('/', authenticate, getAllVeterinarians);

module.exports = router;
