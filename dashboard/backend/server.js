'use strict';

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');

const config = require('./config');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Next.js inlines scripts; configure separately if needed
}));

// ── Request logging ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── Health endpoint (no auth) ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Authentication ────────────────────────────────────────────────────────────
app.use('/api', authMiddleware);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Serve Next.js frontend (static export) ────────────────────────────────────
const frontendPath = path.join(__dirname, '..', 'frontend-build');
app.use(express.static(frontendPath));

// SPA fallback — serve the matching static HTML for each route
const fs = require('fs');
app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  // For static export, try serving the specific page HTML first
  // e.g. /login → login.html, /instances → instances.html
  const cleanPath = req.path.replace(/\/+$/, '') || '/index';
  const candidates = [
    path.join(frontendPath, `${cleanPath}.html`),
    path.join(frontendPath, cleanPath, 'index.html'),
    path.join(frontendPath, 'index.html'),
  ];

  const match = candidates.find((f) => fs.existsSync(f));
  if (match) {
    return res.sendFile(match);
  }
  res.status(404).json({ error: 'Frontend not built. Run: cd frontend && npm run build' });
});

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(config.port, '0.0.0.0', () => {
  console.log(`[Dashboard] Listening on port ${config.port}`);
  console.log(`[Dashboard] Project root: ${config.projectRoot}`);
});

module.exports = app;
