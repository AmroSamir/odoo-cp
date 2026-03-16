'use strict';

const express = require('express');
const router = express.Router();
const setupService = require('../services/productionSetupService');
const { shellExec } = require('../utils/shellExec');

/**
 * GET /api/setup/status
 * Returns whether production Odoo has been deployed.
 */
router.get('/status', async (req, res, next) => {
  try {
    const status = await setupService.getSetupStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/setup/production
 * Deploy production Odoo for the first time.
 * Streams output via SSE.
 *
 * Body: { domain: string, stagingDomain?: string }
 */
router.post('/production', async (req, res) => {
  const { domain, stagingDomain } = req.body;

  if (!domain || typeof domain !== 'string' || !domain.includes('.')) {
    return res.status(400).json({ error: 'Valid production domain is required (e.g. erp.example.com)' });
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering for SSE
  });

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ type: 'start', message: `Deploying production Odoo on ${domain}...` });

  let success = false;

  try {
    const result = await setupService.deployProduction({
      domain,
      stagingDomain,
      onData: (chunk) => {
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
          send({ type: 'log', message: line });
        }
      },
    });

    success = result.exitCode === 0;

    send({
      type: 'done',
      success,
      exitCode: result.exitCode,
      message: success
        ? `Production deployed successfully at https://${domain}`
        : 'Production deployment failed. Check the logs above.',
    });
  } catch (err) {
    send({ type: 'error', message: err.message });
  }

  // End the SSE stream FIRST — the browser receives "done" cleanly
  res.end();

  // THEN reload nginx to pick up the new production config + SSL cert.
  // This happens after the SSE connection is closed, so it can't break it.
  if (success) {
    try {
      await shellExec('docker', ['exec', 'nginx_odoo', 'nginx', '-s', 'reload']);
      console.log('[setup] nginx reloaded with production config');
    } catch (err) {
      console.error('[setup] nginx reload failed:', err.message);
      // Non-fatal — production Odoo is accessible via IP:8069, user can fix nginx later
    }
  }
});

module.exports = router;
