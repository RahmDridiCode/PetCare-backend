const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const Notification = require('../models/Notification');


const ALLOWED_CATEGORIES = ['sante', 'alimentation', 'comportement', 'adoption', 'autre'];

const getAllPosts = async (req, res, next) => {
  try {
    const categoryQuery = req.query.category || req.query.categorie;
    const { startDate, endDate } = req.query;

    const filter = {};

    if (categoryQuery) {
      filter.category = categoryQuery;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const sd = new Date(startDate);
        if (!isNaN(sd.getTime())) filter.createdAt.$gte = sd;
      }
      if (endDate) {
        const ed = new Date(endDate);
        ed.setHours(23, 59, 59, 999);
        if (!isNaN(ed.getTime())) filter.createdAt.$lte = ed;
      }
      if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
    }

    const posts = await Post.find(filter)
      .populate('user', 'fname lname image')
      .populate('sharedBy', 'fname lname image')
      .populate('comments')
      .populate('likes')
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    next(err);
  }
};


const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'fname lname image')
      .populate('sharedBy', 'fname lname image')
      .populate('comments')
      .populate('likes');
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

    const category = req.body.category || req.body.categorie || 'autre';
    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Catégorie invalide', allowed: ALLOWED_CATEGORIES });
    }

    const post = new Post({
      description: req.body.description,
      images: images,
      user: req.user.userId,
      category,
    });

    const p = await post.save();
    const populatedPost = await p.populate('user', 'fname lname image');
    res.status(201).json(p);
  } catch (err) {
    next(err);
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

    // Mise à jour de la catégorie (si fournie)
    const newCategory = req.body.category || req.body.categorie;
    if (typeof newCategory !== 'undefined') {
      if (newCategory && !ALLOWED_CATEGORIES.includes(newCategory)) {
        return res.status(400).json({ message: 'Catégorie invalide', allowed: ALLOWED_CATEGORIES });
      }
      post.category = newCategory || 'autre';
    }

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

    // create notification (si commentateur n'est pas le destinataire)
    try {
      // Si post partagé → notifier le partageur ; sinon → notifier le propriétaire
      const notifOwnerId = post.sharedBy
        ? post.sharedBy.toString()
        : post.user.toString();

      if (notifOwnerId !== req.user.userId) {
        const notif = await Notification.create({
          userId: notifOwnerId,
          actorId: req.user.userId,
          actionType: 'comment',
          postId: post._id,   // l'_id du post commenté (partagé ou original)
        });
        const populated = await Notification.findById(notif._id)
          .populate('actorId', 'fname lname image')
          .populate({
            path: 'postId',
            select: '_id sharedBy originalPost',
            populate: { path: 'sharedBy', select: 'fname lname' },
          });
        const io = req.app && req.app.get && req.app.get('io');
        if (io) {
          io.to(notifOwnerId).emit('notification', populated);
          const count = await Notification.countDocuments({ userId: notifOwnerId, read: false });
          io.to(notifOwnerId).emit('notificationsCount', { count });
        }
      }
    } catch (e) {
      console.error('Notification error:', e.message || e);
    }

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

      // Déterminer le destinataire de la notification :
      // - si post partagé (sharedBy) → notifier le partageur, postId = ce post partagé
      // - si post original → notifier post.user, postId = post._id
      try {
        const notifOwnerId = post.sharedBy
          ? post.sharedBy.toString()
          : post.user.toString();

        if (notifOwnerId !== req.user.userId) {
          const notif = await Notification.create({
            userId: notifOwnerId,
            actorId: req.user.userId,
            actionType: 'like',
            postId: post._id,   // toujours l'_id du post liké (partagé ou original)
          });
          const populated = await Notification.findById(notif._id)
            .populate('actorId', 'fname lname image')
            .populate({
              path: 'postId',
              select: '_id sharedBy originalPost',
              populate: { path: 'sharedBy', select: 'fname lname' },
            });
          const io = req.app && req.app.get && req.app.get('io');
          if (io) {
            io.to(notifOwnerId).emit('notification', populated);
            const count = await Notification.countDocuments({ userId: notifOwnerId, read: false });
            io.to(notifOwnerId).emit('notificationsCount', { count });
          }
        }
      } catch (e) {
        console.error('Notification error:', e.message || e);
      }
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

// ── Partager un post ──
const sharePost = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId)
      return res.status(401).json({ message: 'Utilisateur non authentifié' });

    const originalPost = await Post.findById(req.params.id).populate('user', 'fname lname image');
    if (!originalPost) return res.status(404).json({ message: 'Post non trouvé' });

    // Interdire de partager son propre post
    if (originalPost.user._id.toString() === req.user.userId)
      return res.status(400).json({ message: 'Vous ne pouvez pas partager votre propre publication' });

    // Vérifier si déjà partagé par cet utilisateur
    const alreadyShared = await Post.findOne({
      sharedBy: req.user.userId,
      originalPost: originalPost._id,
    });
    if (alreadyShared)
      return res.status(400).json({ message: 'Vous avez déjà partagé cette publication' });

    // Créer un nouveau post "partagé"
    const sharedPost = new Post({
      description: originalPost.description,
      images: originalPost.images,
      user: originalPost.user._id,
      sharedBy: req.user.userId,
      originalPost: originalPost._id,
    });

    const saved = await sharedPost.save();
    const populated = await Post.findById(saved._id)
      .populate('user', 'fname lname image')
      .populate('sharedBy', 'fname lname image');

    // Notification au propriétaire du post original
    try {
      const notif = await Notification.create({
        userId: originalPost.user._id,
        actorId: req.user.userId,
        actionType: 'share',
        postId: saved._id,          // lien vers le post partagé (visible dans le profil du partageur)
      });
      const populatedNotif = await Notification.findById(notif._id)
        .populate('actorId', 'fname lname image')
        .populate('postId', '_id');
      const io = req.app && req.app.get && req.app.get('io');
      if (io) {
        io.to(originalPost.user._id.toString()).emit('notification', populatedNotif);
        const count = await Notification.countDocuments({ userId: originalPost.user._id, read: false });
        io.to(originalPost.user._id.toString()).emit('notificationsCount', { count });
      }
    } catch (e) {
      console.error('Share notification error:', e.message || e);
    }

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

// ── Posts + partages d'un utilisateur (pour son profil) ──
const getPostsByUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    // Posts originaux créés par cet utilisateur
    const ownPosts = await Post.find({ user: userId, sharedBy: null })
      .populate('user', 'fname lname image')
      .populate('comments')
      .populate('likes')
      .sort({ createdAt: -1 });

    // Posts partagés par cet utilisateur
    const sharedPosts = await Post.find({ sharedBy: userId })
      .populate('user', 'fname lname image')
      .populate('sharedBy', 'fname lname image')
      .populate('comments')
      .populate('likes')
      .sort({ createdAt: -1 });

    // Fusionner et trier par date
    const allPosts = [...ownPosts, ...sharedPosts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.status(200).json(allPosts);
  } catch (err) {
    next(err);
  }
};
  const reportPost = async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId)
        return res.status(401).json({ message: 'Utilisateur non authentifié' });

      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: 'Post non trouvé' });

      const reason = req.body.reason || 'No reason provided';
      post.reports = post.reports || [];
      post.reports.push({ userId: req.user.userId, reason, createdAt: new Date() });

      const saved = await post.save();
      // create notifications for admins about this report
      try {
        const admins = await require('../models/User').find({ role: 'admin' }).select('_id');
        for (const a of admins) {
          const notif = await Notification.create({
            userId: a._id,
            actorId: req.user.userId,
            actionType: 'report',
            postId: post._id,
          });
          const populated = await Notification.findById(notif._id).populate('actorId', 'fname lname image').populate('postId', '_id');
          const io = req.app && req.app.get && req.app.get('io');
          if (io) {
            io.to(a._id.toString()).emit('notification', populated);
            const count = await Notification.countDocuments({ userId: a._id, read: false });
            io.to(a._id.toString()).emit('notificationsCount', { count });
          }
        }
      } catch (e) {
        console.error('Report notification error:', e.message || e);
      }
      res.status(200).json(saved);
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
  sharePost,
  getPostsByUser,
    reportPost,
};