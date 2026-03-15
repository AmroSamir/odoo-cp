'use strict';

const { execFile } = require('child_process');
const path = require('path');
const config = require('../config');

/**
 * Execute a shell command safely using execFile (no shell interpolation).
 *
 * @param {string} file - The executable to run (absolute path recommended)
 * @param {string[]} args - Arguments as an array — never build from raw user input
 * @param {object} options
 * @param {number}   [options.timeout]  - Timeout in ms (default: config.shellTimeout)
 * @param {string}   [options.cwd]      - Working directory
 * @param {Function} [options.onData]   - Called with each stdout chunk (for streaming)
 * @param {Function} [options.onError]  - Called with each stderr chunk
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
function shellExec(file, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout ?? config.shellTimeout;
    const cwd = options.cwd ?? config.projectRoot;

    const child = execFile(
      file,
      args,
      { timeout, cwd, maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const exitCode = error?.code ?? 0;
        // Non-zero exit is not necessarily a hard failure for some commands
        resolve({ stdout: stdout || '', stderr: stderr || '', exitCode });
      }
    );

    if (options.onData && child.stdout) {
      child.stdout.on('data', options.onData);
    }
    if (options.onError && child.stderr) {
      child.stderr.on('data', options.onError);
    }
  });
}

/**
 * Execute a bash script with shellExec.
 * Validates that the script path is within the project root.
 */
function runScript(scriptPath, args = [], options = {}) {
  // Safety: ensure script is within project root
  const resolved = path.resolve(scriptPath);
  const root = path.resolve(config.projectRoot);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return Promise.reject(new Error(`Script path outside project root: ${scriptPath}`));
  }
  return shellExec('bash', [resolved, ...args], options);
}

module.exports = { shellExec, runScript };
