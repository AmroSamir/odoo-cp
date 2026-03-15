'use strict';

const express = require('express');
const gitService = require('../services/gitService');

const router = express.Router();

router.get('/status', async (req, res, next) => {
  try {
    const status = await gitService.getStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

router.post('/pull', async (req, res, next) => {
  try {
    const result = await gitService.pull();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
