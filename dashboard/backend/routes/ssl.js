'use strict';

const express = require('express');
const sslService = require('../services/sslService');

const router = express.Router();

router.get('/status', async (req, res, next) => {
  try {
    const certs = await sslService.getCertStatus();
    res.json(certs);
  } catch (err) {
    next(err);
  }
});

router.post('/renew', async (req, res, next) => {
  try {
    const result = await sslService.renewCerts();
    res.json({ ok: result.exitCode === 0, stdout: result.stdout, stderr: result.stderr });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
