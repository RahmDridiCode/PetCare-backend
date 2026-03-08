const express = require('express');
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { register, login, googleAuth } = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  [
    body('fname').trim().notEmpty().withMessage('First name is required'),
    body('lname').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim(),
    body('birthdate').optional().isISO8601().withMessage('Invalid date format'),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.post(
  '/google',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('fname').trim().notEmpty().withMessage('First name is required'),
    body('lname').trim().notEmpty().withMessage('Last name is required'),
  ],
  validate,
  googleAuth
);

module.exports = router;

