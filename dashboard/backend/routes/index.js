'use strict';

const express = require('express');

const router = express.Router();

router.use('/auth',       require('./auth'));
router.use('/setup',      require('./setup'));
router.use('/instances',  require('./instances'));
router.use('/monitoring', require('./monitoring'));
router.use('/backups',    require('./backups'));
router.use('/deploy',     require('./deploy'));
router.use('/ssl',        require('./ssl'));
router.use('/git',        require('./git'));

module.exports = router;
