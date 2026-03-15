'use strict';

const fs = require('fs').promises;
const path = require('path');
const { shellExec, runScript } = require('../utils/shellExec');
const config = require('../config');

const CERTBOT_LIVE_DIR = '/etc/letsencrypt/live';
const CERTBOT_RENEWAL_DIR = '/etc/letsencrypt/renewal';

/**
 * Get SSL certificate status for all domains managed by certbot.
 */
async function getCertStatus() {
  const certs = [];

  try {
    const domains = await fs.readdir(CERTBOT_LIVE_DIR);
    for (const domain of domains) {
      if (domain === 'README') continue;
      const certPath = path.join(CERTBOT_LIVE_DIR, domain, 'fullchain.pem');
      try {
        // Read expiry with openssl
        const { stdout } = await shellExec('openssl', [
          'x509', '-in', certPath, '-noout', '-enddate', '-startdate', '-subject',
        ]);

        const expiryMatch = stdout.match(/notAfter=(.+)/);
        const startMatch = stdout.match(/notBefore=(.+)/);

        const expiresAt = expiryMatch ? new Date(expiryMatch[1].trim()) : null;
        const issuedAt = startMatch ? new Date(startMatch[1].trim()) : null;
        const daysLeft = expiresAt
          ? Math.round((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        // Detect self-signed (subject === issuer)
        const { stdout: issuerOut } = await shellExec('openssl', [
          'x509', '-in', certPath, '-noout', '-issuer',
        ]);
        const isSelfSigned = issuerOut.includes(`CN = ${domain}`);

        certs.push({
          domain,
          expiresAt: expiresAt?.toISOString() || null,
          issuedAt: issuedAt?.toISOString() || null,
          daysLeft,
          isSelfSigned,
          status: daysLeft === null ? 'unknown' : daysLeft < 7 ? 'critical' : daysLeft < 30 ? 'warning' : 'ok',
        });
      } catch {
        certs.push({ domain, status: 'error', error: 'Could not read certificate' });
      }
    }
  } catch {
    // /etc/letsencrypt/live doesn't exist yet
  }

  return certs;
}

/**
 * Renew all certbot certificates, then reload nginx.
 */
async function renewCerts() {
  // Stop nginx to free port 80 for standalone challenge, or use webroot
  const result = await shellExec('certbot', ['renew', '--quiet', '--no-eff-email']);

  // Reload nginx
  await shellExec('docker', ['exec', config.containers.nginx, 'nginx', '-s', 'reload'])
    .catch(() => null);

  return result;
}

module.exports = { getCertStatus, renewCerts };
