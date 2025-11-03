// server/io.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

function initIo(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // adjust in production to your frontend origin
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    // Expect token in query or auth header
    const token = (socket.handshake.auth && socket.handshake.auth.token) || (socket.handshake.headers && socket.handshake.headers.authorization && socket.handshake.headers.authorization.split(' ')[1]);
    if (!token) return next(); // allow anonymous connections but they will be unauthenticated
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload;
      return next();
    } catch (e) {
      console.warn('socket auth failed', e.message);
      return next(); // still allow connection; server events will be filtered as needed
    }
  });

  io.on('connection', (socket) => {
    // join rooms based on role
    try {
      if (socket.user && socket.user.role === 'admin') {
        socket.join('admins');
      }
    } catch (e) {}

    socket.on('echo', (msg) => socket.emit('echo', msg));
    socket.on('disconnect', () => {});
  });

  // attach io to express app so routes can emit: app.set('io', io)
  app.set('io', io);
  return io;
}

module.exports = { initIo };