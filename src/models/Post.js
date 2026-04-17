const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['sante', 'alimentation', 'comportement', 'adoption', 'autre'],
      required: true,
      trim: true,
      default: 'autre',
      index: true,
    },
    images: [String],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Like',
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    // Partage : si ce post est un partage, sharedBy = userId qui a partagé, originalPost = post source
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    originalPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    reports: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Post', postSchema);

