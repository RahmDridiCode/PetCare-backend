const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    id_sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    id_post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    reason: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);