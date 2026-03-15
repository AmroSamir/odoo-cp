'use strict';

const si = require('systeminformation');
const dockerService = require('./dockerService');
const config = require('../config');

// Simple 2-second cache to avoid hammering on frequent polls
let _systemCache = null;
let _systemCacheTs = 0;
const CACHE_TTL_MS = 2000;

/**
 * Get system-level stats: CPU, RAM, disk.
 */
async function getSystemStats() {
  const now = Date.now();
  if (_systemCache && now - _systemCacheTs < CACHE_TTL_MS) {
    return _systemCache;
  }

  const [cpu, mem, disk, net] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
  ]);

  // Find the main disk (usually the largest or mounted at /)
  const rootDisk = disk.find((d) => d.mount === '/') || disk[0] || {};

  const result = {
    cpu: {
      percent: Math.round((cpu.currentLoad || 0) * 10) / 10,
      cores: cpu.cpus?.length || 0,
    },
    ram: {
      usedMB: Math.round((mem.used || 0) / 1024 / 1024),
      totalMB: Math.round((mem.total || 0) / 1024 / 1024),
      percent: mem.total ? Math.round((mem.used / mem.total) * 1000) / 10 : 0,
    },
    disk: {
      usedGB: Math.round((rootDisk.used || 0) / 1024 / 1024 / 1024 * 10) / 10,
      totalGB: Math.round((rootDisk.size || 0) / 1024 / 1024 / 1024 * 10) / 10,
      percent: rootDisk.size ? Math.round((rootDisk.used / rootDisk.size) * 1000) / 10 : 0,
    },
    network: {
      rxMB: Math.round(((net[0]?.rx_bytes || 0) / 1024 / 1024) * 10) / 10,
      txMB: Math.round(((net[0]?.tx_bytes || 0) / 1024 / 1024) * 10) / 10,
    },
    timestamp: new Date().toISOString(),
  };

  _systemCache = result;
  _systemCacheTs = now;
  return result;
}

/**
 * Get per-container resource stats for known Odoo containers.
 */
async function getContainerStats() {
  const containers = await dockerService.listContainers();
  const runningContainers = containers.filter((c) => c.state === 'running');

  const stats = await Promise.all(
    runningContainers.map((c) => dockerService.getContainerStats(c.name))
  );

  return stats.filter(Boolean);
}

module.exports = { getSystemStats, getContainerStats };
