// server/io.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

function initIo(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: true, // in dev allow all; in prod replace with specific origin(s) like ['https://app.example.com']
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["polling", "websocket"], // allow polling fallback and websocket upgrades
    pingInterval: 25000,
    pingTimeout: 60000,
    allowEIO3: false, // set true only if you need legacy engine.io v3 clients
    path: "/socket.io", // default path; keep consistent with client
  });

  // helper to emit to named roles (rooms)
  io.emitToRoles = function (roles = [], event, payload) {
    if (!Array.isArray(roles) || roles.length === 0) return;
    roles.forEach((r) => {
      io.to(r).emit(event, payload);
    });
  };

  // socket auth middleware (non-blocking)
  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake && socket.handshake.auth && socket.handshake.auth.token) ||
        (socket.handshake && socket.handshake.headers && socket.handshake.headers.authorization && socket.handshake.headers.authorization.split(" ")[1]) ||
        (socket.handshake && socket.handshake.query && socket.handshake.query.token); // also accept token in query

      if (!token) {
        socket.__auth = { anonymous: true };
        return next();
      }

      if (!process.env.JWT_SECRET) {
        console.warn("JWT_SECRET not set; skipping verification (dev only).");
        socket.__auth = { anonymous: true };
        return next();
      }

      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = payload;
        socket.__auth = { tokenUsed: true, ok: true, userId: payload && payload.sub };
        return next();
      } catch (e) {
        console.warn("socket auth failed:", e.message);
        socket.__auth = { tokenUsed: true, ok: false, error: e.message };
        // allow connection but without user claims
        return next();
      }
    } catch (outerErr) {
      console.warn("socket auth middleware error:", outerErr && outerErr.stack ? outerErr.stack : outerErr);
      return next();
    }
  });

  io.on("connection", (socket) => {
    try {
      // debug: print handshake summary
      console.log("Socket handshake:", {
        id: socket.id,
        auth: socket.__auth,
        origin: socket.handshake && socket.handshake.headers && socket.handshake.headers.origin,
        transport: socket.conn && socket.conn.transport && socket.conn.transport.name,
      });

      // join role rooms if authenticated
      if (socket.user && socket.user.role) {
        const role = socket.user.role;
        if (role === "admin") socket.join("admins");
        if (role === "student") socket.join("students");
      }

      // keep an echo for testing
      socket.on("echo", (msg) => socket.emit("echo", msg));

      socket.on("disconnect", (reason) => {
        console.log(`Socket disconnected: ${socket.id} reason=${reason}`);
      });
    } catch (e) {
      console.warn("socket connection handler error:", e && e.stack ? e.stack : e);
    }
  });

  // expose io on app both ways for convenience
  try {
    app.locals = app.locals || {};
    app.locals.io = io;
  } catch (e) {
    // ignore
  }
  try {
    app.set("io", io);
  } catch (e) {
    // ignore
  }

  return io;
}

module.exports = { initIo };
