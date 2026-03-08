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
} = require('../controllers/postController');

const router = express.Router();


// Get all posts
router.get('/', getAllPosts);

// Get post by id
router.get('/:id', authenticate, getPostById);

// Create post with images
router.post('/', authenticate, upload.array('images'), createPost);

// Update post
router.put('/:id', authenticate, updatePost);

// Delete post
router.delete('/:id', authenticate, deletePost);

/* ---------- Comments (singulier comme l'ancien projet) ---------- */

// Get all comments of a post
router.get('/:id/comments', authenticate, getComments);

// Add comment
router.post('/:id/comment', authenticate, addComment);

// Update comment
router.put('/:id/comment/:comment_id', authenticate, updateComment);

// Delete comment
router.delete('/:id/comment/:comment_id', authenticate, deleteComment);

/* ---------- Likes ---------- */

// Toggle like
router.post('/:id/like', authenticate, toggleLike);

// Get all likes
router.get('/:id/likes', authenticate, getLikes);

module.exports = router;
