'use strict';

const express = require('express');
const router = express.Router();
const setupService = require('../services/productionSetupService');

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

    send({
      type: 'done',
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      message: result.exitCode === 0
        ? `Production deployed successfully at https://${domain}`
        : 'Production deployment failed. Check the logs above.',
    });
  } catch (err) {
    send({ type: 'error', message: err.message });
  }

  res.end();
});

module.exports = router;
