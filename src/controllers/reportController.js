const Report = require('../models/Report');

const sendReport = async (req, res, next) => {
    try {
        const { id_sender, id_post } = req.params;
        const { description } = req.body; // correspond à Report.description

        if (!id_sender || !id_post) {
            return res.status(400).json({ message: 'id_sender et id_post requis' });
        }

        const newReport = new Report({
            id_sender,
            id_post,
            reason: description,
        });

        const savedReport = await newReport.save();
        res.status(201).json(savedReport);
    } catch (err) {
        next(err);
    }
};

module.exports = { sendReport };