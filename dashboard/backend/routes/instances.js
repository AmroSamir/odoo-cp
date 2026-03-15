'use strict';

const express = require('express');
const stagingService = require('../services/stagingService');
const dockerService = require('../services/dockerService');
const config = require('../config');

const router = express.Router();

/**
 * GET /api/instances
 * List all instances (production + staging) with live Docker status.
 */
router.get('/', async (req, res, next) => {
  try {
    const instances = await stagingService.listInstances();
    res.json(instances);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/instances
 * Create a new staging instance.
 * Body: { name, port?, ttl?, withSsl? }
 * Returns 202 — creation is async, poll GET /api/instances to track.
 */
router.post('/', async (req, res, next) => {
  try {
    let { name, port, ttl, withSsl } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }

    // Sanitize name client-side validation (server enforced in bash too)
    name = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
    if (!name) {
      return res.status(400).json({ error: 'Invalid instance name' });
    }

    // Validate port range if provided
    if (port !== undefined) {
      port = parseInt(port, 10);
      if (isNaN(port) || port < config.portRange.min || port > config.portRange.max) {
        return res.status(400).json({
          error: `Port must be between ${config.portRange.min} and ${config.portRange.max}`,
        });
      }
    }

    if (ttl !== undefined) {
      ttl = parseInt(ttl, 10);
      if (isNaN(ttl) || ttl < 1) {
        return res.status(400).json({ error: 'ttl must be a positive integer (days)' });
      }
    }

    // Launch creation in background (non-blocking)
    stagingService.createInstance({ name, port, ttl, withSsl: !!withSsl })
      .then((result) => {
        if (result.exitCode !== 0) {
          console.error(`[create stg-${name}] failed:`, result.stderr);
        }
      })
      .catch((err) => console.error(`[create stg-${name}] error:`, err));

    res.status(202).json({
      message: `Creating stg-${name}... Poll GET /api/instances to track progress.`,
      name: `stg-${name}`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/instances/:name
 */
router.delete('/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    if (name === 'production') {
      return res.status(403).json({ error: 'Cannot remove the production instance' });
    }
    await stagingService.removeInstance(name);
    res.json({ ok: true, message: `stg-${name} removed` });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/instances/:name/start
 */
router.post('/:name/start', async (req, res, next) => {
  try {
    const { name } = req.params;
    if (name === 'production') {
      await dockerService.startContainer(config.containers.web);
    } else {
      await stagingService.startInstance(name);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/instances/:name/stop
 */
router.post('/:name/stop', async (req, res, next) => {
  try {
    const { name } = req.params;
    if (name === 'production') {
      return res.status(403).json({ error: 'Use the Docker CLI to stop production' });
    }
    await stagingService.stopInstance(name);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/instances/:name/restart
 */
router.post('/:name/restart', async (req, res, next) => {
  try {
    const { name } = req.params;
    let containerName;
    if (name === 'production') {
      containerName = config.containers.web;
    } else {
      containerName = stagingService.getContainerName(name);
    }
    await dockerService.restartContainer(containerName);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/instances/:name/logs
 * SSE endpoint — streams Docker container logs to the client.
 */
router.get('/:name/logs', async (req, res, next) => {
  try {
    const { name } = req.params;
    const tail = parseInt(req.query.tail || '200', 10);

    let containerName;
    if (name === 'production') {
      containerName = config.containers.web;
    } else {
      containerName = stagingService.getContainerName(name);
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    const stream = await dockerService.getContainerLogStream(containerName, { tail, follow: true });

    stream.on('data', (chunk) => {
      // Docker log stream has an 8-byte header; strip it
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line) {
          res.write(`data: ${JSON.stringify(line)}\n\n`);
        }
      }
    });

    stream.on('error', (err) => {
      res.write(`data: ${JSON.stringify(`[ERROR] ${err.message}`)}\n\n`);
      res.end();
    });

    stream.on('end', () => {
      res.write('data: "[STREAM ENDED]"\n\n');
      res.end();
    });

    req.on('close', () => {
      stream.destroy();
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
