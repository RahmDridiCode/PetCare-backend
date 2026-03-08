const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

const register = async (req, res, next) => {
  try {
    const { fname, lname, email, password, birthdate, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      fname,
      lname,
      email,
      password: hashedPassword,
      birthdate,
      phone,
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      user,
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // select('+password') car toJSON le masque
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google authentication' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.status(200).json({
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      user,
    });
  } catch (err) {
    next(err);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    const { email, fname, lname, image } = req.body;

    let user = await User.findOne({ email });
    let created = false;

    if (!user) {
      user = await User.create({ email, fname, lname, image });
      created = true;
    }

    const token = generateToken(user);

    res.status(200).json({
      message: created ? 'User created' : 'Authentication succeeded',
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      user,
    });
  } catch (err) {
    next(err);
  }
};

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

module.exports = { register, login, googleAuth };

