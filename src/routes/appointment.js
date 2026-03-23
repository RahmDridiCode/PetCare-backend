const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const {
  createAppointment,
  getUserAppointments,
  getVeterinarianAppointments,
  acceptAppointment,
  rejectAppointment,
} = require('../controllers/appointmentController');

const router = express.Router();

// Create appointment (authenticated users)
router.post('/', authenticate, createAppointment);

// Get appointments for logged-in user
router.get('/user', authenticate, getUserAppointments);

// Get appointments for veterinarian
router.get('/veterinarian', authenticate, authorize('veterinaire'), getVeterinarianAppointments);

// Accept / Reject (veterinarian only)
router.put('/:id/accept', authenticate, authorize('veterinaire'), acceptAppointment);
router.put('/:id/reject', authenticate, authorize('veterinaire'), rejectAppointment);

module.exports = router;
