'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const config = require('../config');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many login attempts. Try again in 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/login
 * Body: { password: string }
 * Returns: { token: string }
 */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const storedHash = config.adminPasswordHash;
    if (!storedHash) {
      return res.status(503).json({ error: 'Dashboard admin password not configured. Set DASHBOARD_ADMIN_PASSWORD env var.' });
    }

    // Support both plain text (for dev) and bcrypt hashes
    let valid = false;
    if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
      valid = await bcrypt.compare(password, storedHash);
    } else {
      // Dev mode: plain comparison (not for production)
      valid = password === storedHash;
    }

    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: '24h' });

    // Set as httpOnly cookie + return in body for flexibility
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ token, expiresIn: '24h' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

module.exports = router;
