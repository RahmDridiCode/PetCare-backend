const http = require('http');
const app = require('./app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 3000;

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);

  // Setup Socket.io
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Simple auth for sockets using token passed in handshake auth
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = { userId: decoded.userId, role: decoded.role };
      return next();
    } catch (err) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.userId;
    // join a room named by the userId
    socket.join(userId);

    socket.on('sendMessage', async (payload) => {
      // payload: { receiverId, text }
      try {
        const Message = require('./src/models/Message');
        const msg = new Message({ senderId: userId, receiverId: payload.receiverId, text: payload.text });
        const saved = await msg.save();
        const populated = await Message.findById(saved._id)
          .populate('senderId', 'fname lname image')
          .populate('receiverId', 'fname lname image');

        // emit to receiver room
        io.to(payload.receiverId).emit('receiveMessage', populated);
        // emit back to sender for confirmation
        socket.emit('messageSent', populated);
      } catch (err) {
        // ignore
      }
    });

    // Marquer les messages comme lus
    socket.on('messagesRead', async (payload) => {
      const { from } = payload; // l'expéditeur des messages
      try {
        // Mettre à jour la DB
        await Message.updateMany(
          { senderId: from, receiverId: userId, read: false },
          { $set: { read: true } }
        );
        // Prévenir l'expéditeur que ses messages ont été lus
        io.to(from).emit('messagesRead', { from: userId });
      } catch (err) {
        console.error(err);
      }
    });

    socket.on('disconnect', () => {
      // left
    });
  });

  // make io accessible to controllers via app.locals
  app.set('io', io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

