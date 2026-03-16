'use strict';

const path = require('path');
const config = require('../config');
const { runScript } = require('../utils/shellExec');
const { readDeployConfig, isProductionDeployed } = require('../utils/deployConfig');

/**
 * Get the current setup status: whether production is deployed and with what domain.
 */
async function getSetupStatus() {
  const cfg = await readDeployConfig();
  const deployed = !!(cfg.DOMAIN_PROD && cfg.DOMAIN_PROD.trim());

  return {
    productionDeployed: deployed,
    domainProd: cfg.DOMAIN_PROD || null,
    domainStaging: cfg.DOMAIN_STAGING || null,
    domainDashboard: cfg.DOMAIN_DASHBOARD || null,
    sslEmail: cfg.SSL_EMAIL || null,
    serverIp: cfg.SERVER_IP || null,
  };
}

/**
 * Deploy production Odoo for the first time.
 * Runs scripts/setup-production.sh which handles:
 *   - Downloading addons from Dropbox
 *   - Downloading odoo_unlimited
 *   - Generating docker-compose.yml with Odoo services
 *   - Regenerating nginx config with production server block
 *   - Requesting SSL certificate for production domain
 *   - Starting Odoo containers
 *   - Updating .deploy-config
 *
 * @param {object} params
 * @param {string} params.domain - Production domain (e.g. erp.amro.pro)
 * @param {string} [params.stagingDomain] - Staging base domain (default: staging.{domain})
 * @param {Function} [params.onData] - Callback for streaming output
 * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
 */
async function deployProduction({ domain, stagingDomain, onData } = {}) {
  if (!domain) {
    throw new Error('Production domain is required');
  }

  const deployed = await isProductionDeployed();
  if (deployed) {
    throw new Error('Production is already deployed. Use the Deploy page to update it.');
  }

  const args = ['--domain', domain];
  if (stagingDomain) {
    args.push('--staging-domain', stagingDomain);
  }

  const scriptPath = path.join(config.projectRoot, 'scripts', 'setup-production.sh');

  return runScript(scriptPath, args, {
    timeout: 900_000, // 15 minutes (addons download can be slow)
    onData: onData ? (chunk) => onData(chunk.toString()) : undefined,
    onError: onData ? (chunk) => onData(chunk.toString()) : undefined,
  });
}

module.exports = { getSetupStatus, deployProduction };
