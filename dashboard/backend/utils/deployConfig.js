'use strict';

const fs = require('fs').promises;
const path = require('path');
const config = require('../config');

/**
 * Read .deploy-config (bash-style key=value file) and return as an object.
 */
async function readDeployConfig() {
  try {
    const raw = await fs.readFile(config.deployConfigPath, 'utf8');
    const result = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Update specific keys in .deploy-config while preserving comments and order.
 */
async function updateDeployConfig(updates) {
  let lines = [];
  try {
    const raw = await fs.readFile(config.deployConfigPath, 'utf8');
    lines = raw.split('\n');
  } catch {
    // File doesn't exist yet — start with header
    lines = [
      '# Odoo 19 Enterprise — Deployment Configuration',
      `# Generated on ${new Date().toISOString()}`,
    ];
  }

  const updatedKeys = new Set();

  // Update existing lines
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (key in updates) {
      lines[i] = `${key}=${updates[key]}`;
      updatedKeys.add(key);
    }
  }

  // Append new keys that weren't found
  for (const [key, value] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      lines.push(`${key}=${value}`);
    }
  }

  await fs.writeFile(config.deployConfigPath, lines.join('\n') + '\n');
}

/**
 * Check if production Odoo has been deployed.
 * Returns true if DOMAIN_PROD is set and non-empty in .deploy-config.
 */
async function isProductionDeployed() {
  const cfg = await readDeployConfig();
  return !!(cfg.DOMAIN_PROD && cfg.DOMAIN_PROD.trim());
}

module.exports = { readDeployConfig, updateDeployConfig, isProductionDeployed };
