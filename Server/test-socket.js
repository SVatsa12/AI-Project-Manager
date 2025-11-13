// test-socket.js
const { io } = require("socket.io-client");

const URL = "http://localhost:4003";
const socket = io(URL, {
  path: "/socket.io",           // must match server
  transports: ["websocket"],    // force websocket for simplicity
  auth: { token: "test-jwt-token-if-needed" } // optional
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
  // test echo event
  socket.emit("echo", { msg: "hello socket" });
});

socket.on("echo", (data) => {
  console.log("🪞 Echo received:", data);
  socket.disconnect();
  process.exit(0);
});

socket.on("connect_error", (err) => {
  console.error("❌ connect_error:", err.message);
  process.exit(1);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 Disconnected:", reason);
});
