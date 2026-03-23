const express = require('express');
const router = express.Router();
const { sendReport } = require('../controllers/reportController');
const {authenticate} = require("../middlewares/auth");

router.post('/send/:id_sender/:id_post',authenticate, sendReport);

module.exports = router;