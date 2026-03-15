'use strict';

const Dockerode = require('dockerode');
const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

/**
 * List all containers with status and basic info.
 */
async function listContainers() {
  const containers = await docker.listContainers({ all: true });
  return containers.map((c) => ({
    id: c.Id.substring(0, 12),
    name: (c.Names[0] || '').replace(/^\//, ''),
    image: c.Image,
    status: c.Status,
    state: c.State,
    ports: c.Ports,
    created: new Date(c.Created * 1000).toISOString(),
  }));
}

/**
 * Get a single container's stats snapshot (CPU%, memory).
 * Returns null if container is not running.
 */
async function getContainerStats(containerName) {
  try {
    const container = docker.getContainer(containerName);
    const info = await container.inspect();
    if (info.State.Status !== 'running') return null;

    return new Promise((resolve, reject) => {
      container.stats({ stream: false }, (err, data) => {
        if (err) return resolve(null);
        try {
          const cpuDelta = data.cpu_stats.cpu_usage.total_usage - data.precpu_stats.cpu_usage.total_usage;
          const systemDelta = data.cpu_stats.system_cpu_usage - data.precpu_stats.system_cpu_usage;
          const numCpus = data.cpu_stats.online_cpus || data.cpu_stats.cpu_usage.percpu_usage?.length || 1;
          const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

          const memUsage = data.memory_stats.usage || 0;
          const memLimit = data.memory_stats.limit || 1;
          const memPercent = (memUsage / memLimit) * 100;

          resolve({
            name: containerName,
            cpuPercent: Math.round(cpuPercent * 10) / 10,
            memUsageMB: Math.round(memUsage / 1024 / 1024),
            memLimitMB: Math.round(memLimit / 1024 / 1024),
            memPercent: Math.round(memPercent * 10) / 10,
          });
        } catch {
          resolve(null);
        }
      });
    });
  } catch {
    return null;
  }
}

/**
 * Get a readable log stream for a container (for SSE).
 */
async function getContainerLogStream(containerName, { tail = 100, follow = true } = {}) {
  const container = docker.getContainer(containerName);
  return container.logs({
    follow,
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
  });
}

/**
 * Start / stop / restart a container by name.
 */
async function startContainer(containerName) {
  const container = docker.getContainer(containerName);
  await container.start();
}

async function stopContainer(containerName) {
  const container = docker.getContainer(containerName);
  await container.stop({ t: 10 });
}

async function restartContainer(containerName) {
  const container = docker.getContainer(containerName);
  await container.restart({ t: 10 });
}

/**
 * Get container state: 'running' | 'exited' | 'absent' | etc.
 */
async function getContainerState(containerName) {
  try {
    const container = docker.getContainer(containerName);
    const info = await container.inspect();
    return info.State.Status;
  } catch {
    return 'absent';
  }
}

module.exports = {
  listContainers,
  getContainerStats,
  getContainerLogStream,
  startContainer,
  stopContainer,
  restartContainer,
  getContainerState,
};
