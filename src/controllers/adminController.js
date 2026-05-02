const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Report = require('../models/Report');
const Appointment = require('../models/appointmentModel');
const Chat = require('../models/Chat');

// List pending veterinarians
const getPendingVeterinarians = async (req, res, next) => {
  try {
    const vets = await User.find({ role: 'veterinaire', isApproved: false }).select(
      'fname lname email phone adresse diploma createdAt'
    );
    res.status(200).json(vets);
  } catch (err) {
    next(err);
  }
};

const approveVeterinarian = async (req, res, next) => {
  try {
    const id = req.params.id;
    const vet = await User.findByIdAndUpdate(id, { isApproved: true }, { new: true });
    if (!vet) return res.status(404).json({ message: 'Veterinarian not found' });
    res.status(200).json(vet);
  } catch (err) {
    next(err);
  }
};

const rejectVeterinarian = async (req, res, next) => {
  try {
    const id = req.params.id;
    const vet = await User.findByIdAndDelete(id);
    if (!vet) return res.status(404).json({ message: 'Veterinarian not found' });
    res.status(200).json({ message: 'Veterinarian rejected and deleted' });
  } catch (err) {
    next(err);
  }
};

// Users management
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Delete all user-related data
    await Promise.all([
      Comment.deleteMany({ user: userId }),
      Like.deleteMany({ user: userId }),
      Notification.deleteMany({ $or: [{ userId }, { actorId: userId }] }),
      Chat.deleteMany({ userId }),
      Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
      Report.deleteMany({ id_sender: userId }),
      Appointment.deleteMany({ $or: [{ userId }, { veterinarianId: userId }] })
    ]);

    // 2. CLEAN REFERENCES (IMPORTANT PART YOU MISSED)

    await Promise.all([
      // remove sharedBy reference
      Post.updateMany(
        { sharedBy: userId },
        { $unset: { sharedBy: "" } }
      ),

      // remove user reports inside posts
      Post.updateMany(
        { "reports.userId": userId },
        { $pull: { reports: { userId: userId } } }
      ),

      // remove originalPost references
      Post.updateMany(
        { originalPost: userId },
        { $set: { originalPost: null } }
      ),

      // optional safety: remove user from likes/comments arrays if embedded
      Post.updateMany(
        {},
        {
          $pull: {
            likes: { user: userId },
            comments: { user: userId }
          }
        }
      )
    ]);

    // 3. Delete user
    await User.deleteOne({ _id: userId });

    return res.json({ message: "User deleted successfully" });

  } catch (err) {
    return res.status(500).json({
      message: "Error deleting user",
      error: err.message
    });
  }
};

// Reported posts
const getReportedPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({ 'reports.0': { $exists: true } })
      .populate('user', 'fname lname')
      .populate({ path: 'reports.userId', select: 'fname lname' })
      .lean();
    res.status(200).json(posts);
  } catch (err) {
    next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const id = req.params.id;
    const post = await Post.findByIdAndDelete(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Cleanup related comments and likes
    await Comment.deleteMany({ post: id });
    await Like.deleteMany({ post: id });

    res.status(200).json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
};

const clearReports = async (req, res, next) => {
  try {
    const id = req.params.id;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.reports = [];
    await post.save();
    res.status(200).json({ message: 'Reports cleared' });
  } catch (err) {
    next(err);
  }
};

// Admin aggregated stats
const getAdminStats = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    const [
      totalUsers,
      totalVeterinarians,
      totalPosts,
      totalAppointments,
      totalComments,
      newUsersToday,
      newPostsToday,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'veterinaire' }),
      Post.countDocuments(),
      Appointment.countDocuments(),
      Comment.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      Post.countDocuments({ createdAt: { $gte: startOfToday } }),
    ]);

    // Top posters
    const topPosters = await Post.aggregate([
      { $group: { _id: '$user', posts: { $sum: 1 } } },
      { $sort: { posts: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, userId: '$_id', posts: 1, user: { fname: '$user.fname', lname: '$user.lname', email: '$user.email', image: '$user.image' } } }
    ]);

    // Top veterinarians by appointment count and avg rating
    const topVets = await Appointment.aggregate([
      { $group: { _id: '$veterinarianId', appointments: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      { $sort: { appointments: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'vet' } },
      { $unwind: { path: '$vet', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, veterinarianId: '$_id', appointments: 1, avgRating: { $ifNull: ['$avgRating', 0] }, vet: { fname: '$vet.fname', lname: '$vet.lname', email: '$vet.email', image: '$vet.image' } } }
    ]);

    // Top liked posts
    const topLikedPosts = await Like.aggregate([
      { $group: { _id: '$post', likes: { $sum: 1 } } },
      { $sort: { likes: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'posts', localField: '_id', foreignField: '_id', as: 'post' } },
      { $unwind: { path: '$post', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'post.user', foreignField: '_id', as: 'author' } },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, postId: '$_id', likes: 1, post: { description: '$post.description', createdAt: '$post.createdAt' }, author: { fname: '$author.fname', lname: '$author.lname' } } }
    ]);

    // Recent activity: latest 6 posts and latest 6 appointments
    const recentPosts = await Post.find().sort({ createdAt: -1 }).limit(6).populate('user', 'fname lname image').lean();
    const recentAppointments = await Appointment.find().sort({ createdAt: -1 }).limit(6).populate('userId', 'fname lname').populate('veterinarianId', 'fname lname').lean();

    res.status(200).json({
      totalUsers,
      totalVeterinarians,
      totalPosts,
      totalAppointments,
      totalComments,
      newUsersToday,
      newPostsToday,
      topPosters,
      topVets,
      topLikedPosts,
      recentPosts,
      recentAppointments,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPendingVeterinarians,
  approveVeterinarian,
  rejectVeterinarian,
  getAllUsers,
  deleteUser,
  getReportedPosts,
  deletePost,
  clearReports,
  getAdminStats,
};

