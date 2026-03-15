'use strict';

const express = require('express');
const backupService = require('../services/backupService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const backups = await backupService.listBackups();
    res.json(backups);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = await backupService.createBackup();
    res.json({ ok: result.exitCode === 0, stdout: result.stdout, stderr: result.stderr });
  } catch (err) {
    next(err);
  }
});

router.delete('/:filename', async (req, res, next) => {
  try {
    await backupService.deleteBackup(req.params.filename);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
