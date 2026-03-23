const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Like = require('../models/Like');


const getAllPosts = async (_req, res, next) => {
  try {
    const posts = await Post.find({}).populate('user comments likes');
    res.status(200).json(posts);
  } catch (err) {
    next(err);
  }
};


const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('user comments likes');
    if (!post) return res.status(404).json({ message: 'Post non trouvé' });
    res.status(200).json(post);
  } catch (err) {
    next(err);
  }
};


const createPost = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId)
      return res.status(401).json({ message: 'Utilisateur non authentifié' });

    const baseUrl = req.protocol + '://' + req.get('host');
    const images =
        req.files && req.files.length > 0
            ? req.files.map((f) => baseUrl + '/images/' + f.filename)
            : [];

    const post = new Post({
      description: req.body.description,
      images: images,
      user: req.user.userId,
    });

    const p = await post.save();
    const populatedPost = await p.populate('user', 'fname lname image');
    res.status(201).json(p);
  } catch (err) {
    next(err);d
  }
};


const updatePost = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId)
      return res.status(401).json({ message: 'Utilisateur non authentifié' });

    const post = await Post.findOne({ _id: req.params.id, user: req.user.userId });
    if (!post) return res.status(404).json({ message: 'Post non trouvé ou pas autorisé' });

    // Mise à jour de la description
    if (req.body.description) post.description = req.body.description;

    // Gestion des images
    const baseUrl = req.protocol + '://' + req.get('host');

    // Images existantes à conserver
    let existingImages = [];
    if (req.body.existingImages) {
      try {
        existingImages = JSON.parse(req.body.existingImages);
      } catch {}
    }

    // Nouvelles images uploadées
    const newImages = req.files ? req.files.map(f => baseUrl + '/images/' + f.filename) : [];

    post.images = [...existingImages, ...newImages];

    await post.save();
    const populatedPost = await post.populate('user', 'fname lname image');

    res.status(200).json(populatedPost);
  } catch (err) {
    next(err);
  }
};


const deletePost = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId)
      return res.status(401).json({ message: 'Utilisateur non authentifié' });

    const post = await Post.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
    if (!post) return res.status(404).json({ message: 'Post non trouvé ou pas autorisé' });

    // Supprimer likes et commentaires liés
    await Comment.deleteMany({ post: req.params.id });
    await Like.deleteMany({ post: req.params.id });

    res.status(200).json({ message: 'Post supprimé', post });
  } catch (err) {
    next(err);
  }
};


const getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.id }).populate('user');
    res.status(200).json(comments);
  } catch (err) {
    next(err);
  }
};


const addComment = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId)
      return res.status(401).json({ message: 'Utilisateur non authentifié' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post non trouvé' });

    const comment = new Comment({
      text: req.body.text,
      post: req.params.id,
      user: req.user.userId,
    });

    const savedComment = await comment.save();
    post.comments.push(savedComment._id);
    const updatedPost = await post.save();

    res.status(201).json(updatedPost);
  } catch (err) {
    next(err);
  }
};


const updateComment = async (req, res, next) => {
  try {
    const comment = await Comment.findOneAndUpdate(
        { _id: req.params.comment_id, user: req.user.userId },
        { text: req.body.text },
        { returnDocument: 'after' }
    );

    if (!comment) return res.status(404).json({ message: 'Commentaire non trouvé ou pas autorisé' });

    res.status(200).json(comment);
  } catch (err) {
    next(err);
  }
};


const deleteComment = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post non trouvé' });

    await Comment.findOneAndDelete({ _id: req.params.comment_id, user: req.user.userId });
    post.comments.pull(req.params.comment_id);
    const updatedPost = await post.save();

    res.status(200).json(updatedPost);
  } catch (err) {
    next(err);
  }
};


const toggleLike = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId)
      return res.status(401).json({ message: 'Utilisateur non authentifié' });

    const post = await Post.findById(req.params.id).populate('likes');
    if (!post) return res.status(404).json({ message: 'Post non trouvé' });

    const existingLike = post.likes.find((l) => l.user.toString() === req.user.userId);
    let updatedPost;

    if (existingLike) {
      // Retirer le like
      post.likes.pull(existingLike._id);
      await Like.findByIdAndDelete(existingLike._id);
      updatedPost = await post.save();
    } else {
      // Ajouter le like
      const newLike = new Like({ user: req.user.userId, post: req.params.id });
      const savedLike = await newLike.save();
      post.likes.push(savedLike._id);
      updatedPost = await post.save();
    }

    res.status(200).json(updatedPost);
  } catch (err) {
    next(err);
  }
};


const getLikes = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('likes');
    if (!post) return res.status(404).json({ message: 'Post non trouvé' });
    res.status(200).json(post.likes);
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};