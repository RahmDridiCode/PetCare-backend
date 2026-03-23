const Appointment = require('../models/appointmentModel');
const User = require('../models/User');

const createAppointment = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId)
      return res.status(401).json({ message: 'Utilisateur non authentifié' });

    const { veterinarianId, date, time } = req.body;
    if (!veterinarianId || !date || !time)
      return res.status(400).json({ message: 'Données manquantes' });

    const vet = await User.findById(veterinarianId);
    if (!vet) return res.status(404).json({ message: 'Vétérinaire introuvable' });

    const appointment = new Appointment({
      userId: req.user.userId,
      veterinarianId,
      date: new Date(date),
      time,
      status: 'pending',
    });

    const saved = await appointment.save();
      await saved.populate([
          { path: 'userId', select: 'fname lname' },
          { path: 'veterinarianId', select: 'fname lname' }
      ]);

      res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

const getUserAppointments = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId)
      return res.status(401).json({ message: 'Utilisateur non authentifié' });

      const appointments = await Appointment.find({ userId: req.user.userId }).populate('veterinarianId', 'fname lname image').sort({ date: -1 });
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

const getVeterinarianAppointments = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId)
      return res.status(401).json({ message: 'Utilisateur non authentifié' });

    // role check should be done by route authorize middleware, but double-check here
    if (req.user.role !== 'veterinaire')
      return res.status(403).json({ message: 'Accès refusé' });

    const appointments = await Appointment.find({ veterinarianId: req.user.userId }).populate('userId', 'fname lname image').sort({ date: -1 });
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

const acceptAppointment = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) return res.status(401).json({ message: 'Utilisateur non authentifié' });

    if (req.user.role !== 'veterinaire') return res.status(403).json({ message: 'Accès refusé' });

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Rendez-vous introuvable' });
    if (appointment.veterinarianId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Ce rendez-vous n'appartient pas à ce vétérinaire" });

    appointment.status = 'accepted';
    await appointment.save();
    res.status(200).json(appointment);
  } catch (err) {
    next(err);
  }
};

const rejectAppointment = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) return res.status(401).json({ message: 'Utilisateur non authentifié' });

    if (req.user.role !== 'veterinaire') return res.status(403).json({ message: 'Accès refusé' });

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Rendez-vous introuvable' });
    if (appointment.veterinarianId.toString() !== req.user.userId)
      return res.status(403).json({ message: "Ce rendez-vous n'appartient pas à ce vétérinaire" });

    appointment.status = 'rejected';
    await appointment.save();
    res.status(200).json(appointment);
  } catch (err) {
    next(err);
  }
};

const rateVeterinarian = async (req, res, next) => {
    try {
        const { appointmentId, rating } = req.body;

        if (!req.user || !req.user.userId)
            return res.status(401).json({ message: 'Utilisateur non authentifié' });

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return res.status(404).json({ message: 'Rendez-vous introuvable' });

        if (appointment.userId.toString() !== req.user.userId)
            return res.status(403).json({ message: "Vous ne pouvez noter que vos rendez-vous" });

        if (rating < 1 || rating > 5)
            return res.status(400).json({ message: 'La note doit être entre 1 et 5' });

        appointment.rating = rating;
        await appointment.save();

        // Mettre à jour la moyenne globale dans User
        const vet = await User.findById(appointment.veterinarianId);
        vet.rating = ((vet.rating * vet.ratingCount) + rating) / (vet.ratingCount + 1);
        vet.ratingCount += 1;
        await vet.save();

        res.status(200).json({ message: 'Rendez-vous noté avec succès', appointment, vet });
    } catch (err) {
        next(err);
    }
};

module.exports = {
  createAppointment,
  getUserAppointments,
  getVeterinarianAppointments,
  acceptAppointment,
  rejectAppointment,
  rateVeterinarian,
};
