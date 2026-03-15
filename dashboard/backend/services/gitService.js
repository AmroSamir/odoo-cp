'use strict';

const simpleGit = require('simple-git');
const config = require('../config');

const git = simpleGit(config.projectRoot);

/**
 * Get current git status: branch, last commit, dirty state, ahead/behind.
 */
async function getStatus() {
  const [log, status, remote] = await Promise.all([
    git.log({ maxCount: 5 }).catch(() => ({ all: [] })),
    git.status().catch(() => null),
    git.fetch().then(() => git.status()).catch(() => null),
  ]);

  const lastCommits = (log.all || []).map((c) => ({
    hash: c.hash.substring(0, 8),
    message: c.message,
    author: c.author_name,
    date: c.date,
  }));

  return {
    branch: status?.current || 'unknown',
    lastCommit: lastCommits[0] || null,
    recentCommits: lastCommits,
    isDirty: status?.isClean() === false,
    ahead: status?.ahead || 0,
    behind: status?.behind || 0,
    staged: status?.staged?.length || 0,
    modified: status?.modified?.length || 0,
  };
}

/**
 * Pull latest changes from origin.
 */
async function pull() {
  const result = await git.pull();
  return {
    summary: result.summary,
    created: result.created,
    deleted: result.deleted,
    files: result.files,
  };
}

module.exports = { getStatus, pull };
