const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

const signup = async (req, res, next) => {
  try {
    const { fname, lname, email, password, birthdate, phone } = req.body;

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = new User({
      email,
      password: hash,
      fname,
      lname,
      birthdate,
      phone,
    });

    const result = await user.save();
    res.status(200).json({ message: 'User created', result: result });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google authentication' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Unauthorised!' });
    }

    const token = jwt.sign(
      { email: user.email, userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ token: token, expiresIn: 3600, userId: user._id });
  } catch (err) {
    next(err);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    const { email, fname, lname, image } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({ email, fname, lname, image });
      const result = await user.save();
      return res.status(200).json({ message: 'User created', user: result });
    }

    res.status(200).json({ message: 'authentification succeed', user: user });
  } catch (err) {
    next(err);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const name = req.query.name; // ex : "Ahmed Dridi"
    console.log('Searching users with name:', name);

    const regex = new RegExp(name.split(' ').join('.*'), 'i');

    const users = await User.find({
      $or: [
        { fname: regex }, // match prénom
        { lname: regex }, // match nom
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$fname', ' ', '$lname'] }, // combine prénom + nom
              regex: regex,
            },
          },
        },
      ],
    });

    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    res.status(200).json({ user: user });
  } catch (err) {
    next(err);
  }
};

const updateUserWithImage = async (req, res, next) => {
  try {
    let user = req.body;
    let imagePath = '';
    const url = req.protocol + '://' + req.get('host');
    if (req.file) {
      imagePath = url + '/images/' + req.file.filename;
      user = { ...req.body, image: imagePath };
    }
    const result = await User.findByIdAndUpdate(req.params.id, user, { new: true });
    res.status(200).json({ user: result });
  } catch (err) {
    next(err);
  }
};

const findAllUsers = async (_req, res, next) => {
  try {
    const result = await User.find({ role: { $ne: 'admin' } });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Invalid ID' });
    }
    const result = await User.findOneAndDelete({ _id: id });
    if (result) {
      res.status(201).json({ data: result });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Invalid ID' });
    }

    const allowedFields = ['email', 'password', 'lname', 'fname', 'phone', 'image', 'role', 'birthdate'];
    const body = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        body[field] = req.body[field];
      }
    }

    if (body.password) {
      const salt = await bcrypt.genSalt();
      body.password = await bcrypt.hash(body.password, salt);
    }

    const result = await User.findByIdAndUpdate(id, { $set: body }, { new: true });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signup,
  login,
  googleAuth,
  searchUsers,
  getUserById,
  updateUserWithImage,
  findAllUsers,
  deleteUser,
  updateUser,
};
