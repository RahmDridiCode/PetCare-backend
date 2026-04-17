const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/veterinarians/pending', authenticate, authorize('admin'), adminController.getPendingVeterinarians);
router.put('/veterinarians/:id/approve', authenticate, authorize('admin'), adminController.approveVeterinarian);
router.put('/veterinarians/:id/reject', authenticate, authorize('admin'), adminController.rejectVeterinarian);

router.get('/users', authenticate, authorize('admin'), adminController.getAllUsers);
router.delete('/users/:id', authenticate, authorize('admin'), adminController.deleteUser);

router.get('/reported-posts', authenticate, authorize('admin'), adminController.getReportedPosts);
router.delete('/posts/:id', authenticate, authorize('admin'), adminController.deletePost);
router.put('/posts/:id/clear-reports', authenticate, authorize('admin'), adminController.clearReports);

module.exports = router;
