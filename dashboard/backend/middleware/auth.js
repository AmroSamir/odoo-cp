'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

// Routes that don't require authentication
const PUBLIC_PATHS = new Set(['/api/auth/login', '/api/health']);

/**
 * JWT authentication middleware.
 * Verifies Bearer token from Authorization header or cookie.
 * Attaches decoded payload to req.user.
 */
function authMiddleware(req, res, next) {
  if (PUBLIC_PATHS.has(req.path)) return next();

  // Accept token from Authorization header or cookie
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
