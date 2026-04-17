const Post = require('../models/Post');

// Store reports directly in Post.reports as { userId, reason, createdAt }
const sendReport = async (req, res, next) => {
    try {
        const { id_sender, id_post } = req.params;
        const { description } = req.body;

        if (!id_sender || !id_post) {
            return res.status(400).json({ message: 'id_sender et id_post requis' });
        }

        const post = await Post.findById(id_post);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        post.reports = post.reports || [];
        post.reports.push({ userId: id_sender, reason: description || 'No reason provided', createdAt: new Date() });

        await post.save();
        res.status(201).json({ message: 'Report added to post', postId: post._id });
    } catch (err) {
        next(err);
    }
};

module.exports = { sendReport };