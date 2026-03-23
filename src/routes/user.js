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


router.get('/search',authenticate, searchUsers);


router.get('/:id', authenticate, getUserById);


router.put('/:id',authenticate, upload.single('image'), updateUserWithImage);


router.get('',authenticate, findAllUsers);


router.delete('/deleteuser/:id',authenticate, deleteUser);


router.patch('/updateuser/:id',authenticate, updateUser);

module.exports = router;
