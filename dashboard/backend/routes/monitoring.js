'use strict';

const express = require('express');
const monitoringService = require('../services/monitoringService');

const router = express.Router();

router.get('/system', async (req, res, next) => {
  try {
    const stats = await monitoringService.getSystemStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.get('/containers', async (req, res, next) => {
  try {
    const stats = await monitoringService.getContainerStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
