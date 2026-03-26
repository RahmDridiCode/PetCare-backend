const express = require('express');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getComments,
  addComment,
  updateComment,
  deleteComment,
  toggleLike,
  getLikes,
  sharePost,
  getPostsByUser,
} = require('../controllers/postController');

const router = express.Router();

router.get('/', getAllPosts);

// IMPORTANT : route statique avant la route dynamique /:id
router.get('/user/:userId', getPostsByUser);

router.get('/:id', authenticate, getPostById);
router.post('/', authenticate, upload.array('images'), createPost);
router.put('/:id', authenticate, upload.array('images'), updatePost);
router.delete('/:id', authenticate, deletePost);

router.get('/:id/comments', authenticate, getComments);
router.post('/:id/comment', authenticate, addComment);
router.put('/:id/comment/:comment_id', authenticate, updateComment);
router.delete('/:id/comment/:comment_id', authenticate, deleteComment);

router.post('/:id/like', authenticate, toggleLike);
router.get('/:id/likes', authenticate, getLikes);

router.post('/:id/share', authenticate, sharePost);

module.exports = router;
