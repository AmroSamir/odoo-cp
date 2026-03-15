'use strict';

const express = require('express');
const deployService = require('../services/deployService');

const router = express.Router();

router.get('/history', async (req, res, next) => {
  try {
    const history = await deployService.getHistory();
    res.json(history);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/deploy/staging
 * Streams output via SSE.
 */
router.post('/staging', async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const result = await deployService.deployToStaging({
      onData: (chunk) => res.write(`data: ${JSON.stringify(chunk)}\n\n`),
    });

    res.write(`data: ${JSON.stringify({ done: true, exitCode: result.exitCode })}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/deploy/production
 * Body: { confirmed: true }
 */
router.post('/production', async (req, res, next) => {
  try {
    if (req.body.confirmed !== true) {
      return res.status(400).json({ error: 'Requires { confirmed: true } in request body' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const result = await deployService.deployToProduction({
      confirmed: true,
      onData: (chunk) => res.write(`data: ${JSON.stringify(chunk)}\n\n`),
    });

    res.write(`data: ${JSON.stringify({ done: true, exitCode: result.exitCode })}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
