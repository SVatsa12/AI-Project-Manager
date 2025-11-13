// server/middleware/authMiddleware.js
// Optionally require JWT authentication for /api/chat depending on ALLOW_PUBLIC_CHAT env var.
// If ALLOW_PUBLIC_CHAT is "true", the middleware is a no-op.

const jwt = require("jsonwebtoken");

const ALLOW_PUBLIC_CHAT = String(process.env.ALLOW_PUBLIC_CHAT || "true").toLowerCase() === "true";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"; // replace in prod

function requireAuthIfEnabled(req, res, next) {
  if (ALLOW_PUBLIC_CHAT) return next();

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { requireAuthIfEnabled };
