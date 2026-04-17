const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // owner of notification
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who did the action
    actionType: { type: String, enum: ['like', 'comment', 'share', 'appointment', 'appointment_accepted', 'appointment_rejected', 'report', 'vet_request', 'other'], required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
