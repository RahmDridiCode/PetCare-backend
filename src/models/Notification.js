const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // owner of notification
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who did the action
    actionType: { type: String, enum: ['like', 'comment', 'share', 'appointment', 'other'], required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
