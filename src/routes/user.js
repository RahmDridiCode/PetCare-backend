const express = require('express');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  signup,
  login,
  googleAuth,
  searchUsers,
  getUserById,
  updateUserWithImage,
  findAllUsers,
  deleteUser,
  updateUser,
} = require('../controllers/userController');

const router = express.Router();


router.post('/signup', signup);
router.post('/login', login);
router.post('/googleAuth', googleAuth);

// User search
router.get('/search', searchUsers);

// Get user by id
router.get('/:id', getUserById);

// Update user with image upload
router.put('/:id', upload.single('image'), updateUserWithImage);

// Get all users (non-admin)
router.get('', findAllUsers);

// Delete user
router.delete('/deleteuser/:id', deleteUser);

// Update user (patch)
router.patch('/updateuser/:id', updateUser);

module.exports = router;
