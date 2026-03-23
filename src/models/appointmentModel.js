const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    veterinarianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    rating: { type: Number, min: 1, max: 5 }, // note donnée par l'utilisateur pour ce rendez-vous
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
