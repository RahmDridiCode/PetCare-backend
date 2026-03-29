const Notification = require('../models/Notification');

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .populate('actorId', 'fname lname image')
      .populate({
        path: 'postId',
        select: '_id sharedBy originalPost description',
        populate: { path: 'sharedBy', select: 'fname lname' },
      })
      .populate('appointmentId', '_id status date time')
      .sort({ createdAt: -1 })
      .limit(30);
    res.status(200).json(notifications);
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    notif.read = true;
    await notif.save();
    // emit updated unread count
    try {
      const io = req.app.get('io');
      if (io) {
        const count = await Notification.countDocuments({ userId: req.user.userId, read: false });
        io.to(req.user.userId).emit('notificationsCount', { count });
      }
    } catch (e) {}

    res.status(200).json({ message: 'Marked as read', notification: notif });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.userId, read: false }, { $set: { read: true } });
    const notifications = await Notification.find({ userId: req.user.userId })
      .populate('actorId', 'fname lname image')
      .populate({
        path: 'postId',
        select: '_id sharedBy originalPost description',
        populate: { path: 'sharedBy', select: 'fname lname' },
      })
      .populate('appointmentId', '_id status date time')
      .sort({ createdAt: -1 })
      .limit(30);
    // emit count 0
    try {
      const io = req.app.get('io');
      if (io) io.to(req.user.userId).emit('notificationsCount', { count: 0 });
    } catch (e) {}
    res.status(200).json({ message: 'All marked as read', notifications });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.userId, read: false });
    res.status(200).json({ count });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, getUnreadCount, markAllRead };
