require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

async function createAdmin(email, password, fname = 'Admin', lname = 'Root') {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/petcare');
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('Admin already exists:', existing._id.toString());
      return process.exit(0);
    }
    const hash = await bcrypt.hash(password, 12);
    const admin = new User({ fname, lname, email, password: hash, role: 'admin', isApproved: true });
    await admin.save();
    console.log('Admin created with id:', admin._id.toString());
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

// If run directly, read args: node create-admin.js email password
if (require.main === module) {
  const [,, email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: node create-admin.js <email> <password>');
    process.exit(1);
  }
  createAdmin(email, password);
}
