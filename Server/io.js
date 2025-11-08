// server/io.js
const { Server } = require("socket.io")
const jwt = require("jsonwebtoken")

function initIo(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // restrict to your frontend origin in production
      methods: ["GET", "POST"],
    },
    // path: "/socket.io" // optional if you changed path
  })

  // helper to emit to named roles (rooms)
  io.emitToRoles = function (roles = [], event, payload) {
    if (!Array.isArray(roles) || roles.length === 0) return
    roles.forEach((r) => {
      io.to(r).emit(event, payload)
    })
  }

  // socket auth middleware (non-blocking)
  io.use((socket, next) => {
    const token =
      (socket.handshake && socket.handshake.auth && socket.handshake.auth.token) ||
      (socket.handshake && socket.handshake.headers && socket.handshake.headers.authorization && socket.handshake.headers.authorization.split(" ")[1])

    if (!token) {
      // no token — allow anonymous socket (but it won't join role rooms)
      return next()
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET)
      socket.user = payload
      return next()
    } catch (e) {
      console.warn("socket auth failed:", e.message)
      // allow connection but without user claims
      return next()
    }
  })

  io.on("connection", (socket) => {
    try {
      // join role rooms if authenticated
      if (socket.user && socket.user.role) {
        const role = socket.user.role
        if (role === "admin") socket.join("admins")
        if (role === "student") socket.join("students")
        // you can also support other roles/rooms here
      }
    } catch (e) {
      console.warn("socket role join failed", e)
    }

    // keep an echo for testing
    socket.on("echo", (msg) => socket.emit("echo", msg))

    socket.on("disconnect", () => {
      // optional cleanup
    })
  })

  // expose io on app both ways for convenience
  try {
    app.locals = app.locals || {}
    app.locals.io = io
  } catch (e) {
    // ignore
  }
  try {
    app.set("io", io)
  } catch (e) {
    // ignore
  }

  return io
}

module.exports = { initIo }
