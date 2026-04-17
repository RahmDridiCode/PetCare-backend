const express = require('express');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const uploadDiploma = require('../middlewares/uploadDiploma');
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


// Accept an optional diploma file (only used when role === 'veterinaire')
router.post('/signup', uploadDiploma.single('diploma'), signup);
router.post('/login', login);
router.post('/googleAuth', googleAuth);


router.get('/search',authenticate, searchUsers);


router.get('/:id', authenticate, getUserById);


router.put('/:id',authenticate, upload.single('image'), updateUserWithImage);


router.get('',authenticate, findAllUsers);

// Return all veterinarians
router.get('/veterinarians', authenticate, (req, res, next) => {
  // delegate to controller function
  return require('../controllers/userController').getAllVeterinarians(req, res, next);
});


router.delete('/deleteuser/:id',authenticate, deleteUser);


router.patch('/updateuser/:id',authenticate, updateUser);

module.exports = router;
