require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const errorHandler = require('./src/middlewares/errorHandler');

// Import routes
const userRoutes = require('./src/routes/user');
const postRoutes = require('./src/routes/post');
const reportRoutes = require('./src//routes/report');
const appointmentRoutes = require('./src/routes/appointment');
const veterinarianRoutes = require('./src/routes/veterinarians');
const messageRoutes = require('./src/routes/message');
const notificationRoutes = require('./src/routes/notification');
const adminRoutes = require('./src/routes/admin');
const chatbotRoutes = require('./src/routes/chatbot');

const app = express();

// --------------- Global middleware ---------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images on /images
app.use('/images', express.static(path.join(__dirname, 'src', 'uploads')));

// --------------- Routes ---------------
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/veterinarians', veterinarianRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// --------------- Centralised error handler (must be last) ---------------
app.use(errorHandler);

module.exports = app;
