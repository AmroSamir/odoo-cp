'use strict';

const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { runScript } = require('../utils/shellExec');

/**
 * Read deploy history (last N entries).
 */
async function getHistory(limit = 50) {
  try {
    const data = await fs.readFile(config.deployHistoryPath, 'utf8');
    const history = JSON.parse(data);
    return Array.isArray(history) ? history.slice(-limit).reverse() : [];
  } catch {
    return [];
  }
}

/**
 * Append a deploy event to history.
 */
async function appendHistory(entry) {
  let history = [];
  try {
    const data = await fs.readFile(config.deployHistoryPath, 'utf8');
    history = JSON.parse(data);
  } catch { /* start fresh */ }

  history.push({ id: Date.now(), ...entry });

  // Keep last 200 entries
  if (history.length > 200) history = history.slice(-200);

  await fs.mkdir(path.dirname(config.deployHistoryPath), { recursive: true });
  await fs.writeFile(config.deployHistoryPath, JSON.stringify(history, null, 2));
}

/**
 * Deploy to staging (non-blocking — streams output via onData callback).
 */
async function deployToStaging({ onData } = {}) {
  const entry = {
    target: 'staging',
    status: 'started',
    startedAt: new Date().toISOString(),
    triggeredBy: 'dashboard',
  };
  await appendHistory(entry);

  const result = await runScript(config.deployStagingScript, [], {
    onData: onData ? (chunk) => onData(chunk.toString()) : undefined,
  });

  await appendHistory({
    ...entry,
    status: result.exitCode === 0 ? 'success' : 'failed',
    finishedAt: new Date().toISOString(),
    exitCode: result.exitCode,
  });

  return result;
}

/**
 * Deploy to production.
 * Requires confirmed === true to prevent accidental triggers.
 */
async function deployToProduction({ confirmed, onData } = {}) {
  if (confirmed !== true) {
    throw new Error('Production deploy requires confirmed: true');
  }

  const entry = {
    target: 'production',
    status: 'started',
    startedAt: new Date().toISOString(),
    triggeredBy: 'dashboard',
  };
  await appendHistory(entry);

  const result = await runScript(config.deployProdScript, [], {
    onData: onData ? (chunk) => onData(chunk.toString()) : undefined,
  });

  await appendHistory({
    ...entry,
    status: result.exitCode === 0 ? 'success' : 'failed',
    finishedAt: new Date().toISOString(),
    exitCode: result.exitCode,
  });

  return result;
}

module.exports = { getHistory, deployToStaging, deployToProduction };
