'use strict';

const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { runScript } = require('../utils/shellExec');
const dockerService = require('./dockerService');

/**
 * Read and parse the staging registry JSON file.
 * Returns [] if file doesn't exist yet.
 */
async function readRegistry() {
  try {
    const data = await fs.readFile(config.registryPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * List all instances: production + all staging entries enriched with live Docker state.
 */
async function listInstances() {
  const [registry, containers] = await Promise.all([
    readRegistry(),
    dockerService.listContainers(),
  ]);

  const containerMap = Object.fromEntries(containers.map((c) => [c.name, c]));

  // Production instance (always listed)
  const prodContainer = containerMap[config.containers.web];
  const instances = [
    {
      name: 'production',
      type: 'production',
      port: 8069,
      containerName: config.containers.web,
      status: prodContainer?.state || 'absent',
      dockerStatus: prodContainer?.status || '',
      createdAt: null,
      ttlDays: null,
      withSsl: true,
    },
  ];

  // Staging instances
  for (const entry of registry) {
    const safeName = entry.name.replace(/-/g, '_');
    const webContainer = containerMap[`web_stg_${safeName}`];
    instances.push({
      name: `stg-${entry.name}`,
      type: 'staging',
      port: entry.port,
      containerName: `web_stg_${safeName}`,
      dbContainerName: `db_stg_${safeName}`,
      status: webContainer?.state || 'absent',
      dockerStatus: webContainer?.status || '',
      createdAt: entry.created_at,
      ttlDays: entry.ttl_days,
      withSsl: entry.with_ssl,
      dbName: entry.db_name,
    });
  }

  return instances;
}

/**
 * Create a new staging instance by calling staging-manager.sh.
 * Returns immediately with a job token; callers should poll listInstances.
 */
async function createInstance({ name, port, ttl, withSsl }) {
  const args = ['create', '--name', name];
  if (port) args.push('--port', String(port));
  if (ttl) args.push('--ttl', String(ttl));
  if (withSsl) args.push('--with-ssl');

  // Run in background (non-blocking from the API perspective)
  return runScript(config.stagingManagerScript, args);
}

/**
 * Remove a staging instance (--force, no confirmation prompt).
 */
async function removeInstance(name) {
  const cleanName = name.replace(/^stg-/, '');
  return runScript(config.stagingManagerScript, ['remove', '--name', cleanName, '--force']);
}

/**
 * Start a stopped staging instance.
 */
async function startInstance(name) {
  const cleanName = name.replace(/^stg-/, '');
  return runScript(config.stagingManagerScript, ['start', '--name', cleanName]);
}

/**
 * Stop a running staging instance (data preserved).
 */
async function stopInstance(name) {
  const cleanName = name.replace(/^stg-/, '');
  return runScript(config.stagingManagerScript, ['stop', '--name', cleanName]);
}

/**
 * Get the Docker container name for an instance (for log streaming).
 */
function getContainerName(name) {
  const cleanName = name.replace(/^stg-/, '').replace(/-/g, '_');
  return `web_stg_${cleanName}`;
}

module.exports = {
  listInstances,
  createInstance,
  removeInstance,
  startInstance,
  stopInstance,
  getContainerName,
  readRegistry,
};
