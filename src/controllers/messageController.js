const Message = require('../models/Message');

const sendMessage = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { receiverId, text } = req.body;
    if (!receiverId || !text) return res.status(400).json({ message: 'Invalid payload' });

    const msg = new Message({ senderId: req.user.userId, receiverId, text });
    const saved = await msg.save();

    const populated = await Message.findById(saved._id)
          .populate('senderId', 'fname lname image')
          .populate('receiverId', 'fname lname image');

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
};

const getConversation = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) return res.status(401).json({ message: 'Unauthorized' });
    const otherId = req.params.userId;
    const myId = req.user.userId;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    })
      .sort('createdAt')
      .populate('senderId', 'fname lname image')
      .populate('receiverId', 'fname lname image');

    // mark messages received by me from the other user as read
    await Message.updateMany({ senderId: otherId, receiverId: myId, read: false }, { $set: { read: true } });

    res.status(200).json(messages);
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) return res.status(401).json({ message: 'Unauthorized' });
    const myId = req.user.userId;

    // find all users that have messages with me (either sent or received)
    const sent = await Message.find({ senderId: myId }).distinct('receiverId');
    const received = await Message.find({ receiverId: myId }).distinct('senderId');

    const userIds = Array.from(new Set([...sent.map(String), ...received.map(String)]));

    const User = require('../models/User');
    const users = await User.find({ _id: { $in: userIds } }).select('fname lname image');

    // For convenience, include last message and timestamp
    const conversations = await Promise.all(
      users.map(async (u) => {
        const last = await Message.findOne({ $or: [ { senderId: myId, receiverId: u._id }, { senderId: u._id, receiverId: myId } ] }).sort('-createdAt');
        const unreadCount = await Message.countDocuments({ senderId: u._id, receiverId: myId, read: false });
        return {
          user: u,
          lastMessage: last ? last.text : '',
          lastAt: last ? last.createdAt : null,
          unreadCount,
        };
      })
    );

    res.status(200).json(conversations);
  } catch (err) {
    next(err);
  }
};

module.exports = { sendMessage, getConversation, getUsers };
