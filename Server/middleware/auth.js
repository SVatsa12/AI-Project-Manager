// server/middleware/auth.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Missing or malformed Authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed token' });
  }

  // Extract token safely
  const token = authHeader.slice(7).trim();

  // Load secret with fallback (dev safe)
  const secret =
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    'dev-secret-key';

  try {
    // Verify token and attach payload to request
    const payload = jwt.verify(token, secret);
    req.user = payload; // { sub, role, email, iat, exp }

    // Optional sanity check
    if (!req.user.sub || !req.user.role) {
      console.warn('⚠️  Token verified but missing expected fields');
    }

    next();
  } catch (err) {
    console.warn('❌ JWT verify error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
