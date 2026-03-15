'use strict';

const path = require('path');

const projectRoot = process.env.PROJECT_ROOT;
if (!projectRoot) {
  console.error('[ERROR] PROJECT_ROOT environment variable is not set');
  process.exit(1);
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),

  // Auth
  jwtSecret: process.env.DASHBOARD_SECRET || 'changeme-set-DASHBOARD_SECRET-env',
  adminPasswordHash: process.env.DASHBOARD_ADMIN_PASSWORD || '',

  // Paths
  projectRoot,
  backupsPath: process.env.BACKUPS_PATH || '/opt/backups',
  deployConfigPath: path.join(projectRoot, '.deploy-config'),
  registryPath: path.join(projectRoot, 'staging', '.registry'),
  deployHistoryPath: path.join(projectRoot, 'staging', '.deploy-history.json'),
  stagingDir: path.join(projectRoot, 'staging'),
  stagingManagerScript: path.join(projectRoot, 'scripts', 'staging-manager.sh'),
  deployProdScript: path.join(projectRoot, 'scripts', 'deploy-prod.sh'),
  deployStagingScript: path.join(projectRoot, 'scripts', 'deploy-staging.sh'),
  backupScript: path.join(projectRoot, 'scripts', 'backup.sh'),

  // Staging port range
  portRange: { min: 8171, max: 8199 },

  // Docker container names
  containers: {
    web: 'web_odoo',
    db: 'db_odoo',
    nginx: 'nginx_odoo',
    dashboard: 'odoo_dashboard',
  },

  // Shell exec timeout (ms)
  shellTimeout: 300_000,
};
