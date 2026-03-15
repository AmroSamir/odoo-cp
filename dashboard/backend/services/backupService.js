'use strict';

const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { runScript } = require('../utils/shellExec');

/**
 * List all backup files in BACKUPS_PATH, sorted newest first.
 */
async function listBackups() {
  try {
    const files = await fs.readdir(config.backupsPath);
    const sqlFiles = files.filter((f) => f.endsWith('.sql') || f.endsWith('.sql.gz') || f.endsWith('.dump'));

    const withStats = await Promise.all(
      sqlFiles.map(async (filename) => {
        const filepath = path.join(config.backupsPath, filename);
        const stat = await fs.stat(filepath);
        return {
          filename,
          sizeMB: Math.round((stat.size / 1024 / 1024) * 10) / 10,
          createdAt: stat.mtime.toISOString(),
        };
      })
    );

    return withStats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    return [];
  }
}

/**
 * Run the backup script to create a new manual backup.
 * Returns the result of the script execution.
 */
async function createBackup() {
  return runScript(config.backupScript, []);
}

/**
 * Delete a backup file by filename.
 * Validates the filename stays within BACKUPS_PATH.
 */
async function deleteBackup(filename) {
  // Safety: no path traversal
  const safeName = path.basename(filename);
  const filepath = path.join(config.backupsPath, safeName);

  // Ensure it's within the backups directory
  if (!filepath.startsWith(config.backupsPath + path.sep)) {
    throw new Error('Invalid backup filename');
  }

  await fs.unlink(filepath);
}

/**
 * Get the full path for a backup file (for download/restore).
 * Validates the filename stays within BACKUPS_PATH.
 */
function getBackupPath(filename) {
  const safeName = path.basename(filename);
  const filepath = path.join(config.backupsPath, safeName);
  if (!filepath.startsWith(config.backupsPath + path.sep)) {
    throw new Error('Invalid backup filename');
  }
  return filepath;
}

module.exports = { listBackups, createBackup, deleteBackup, getBackupPath };
