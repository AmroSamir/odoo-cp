export interface Instance {
  name: string;
  type: 'production' | 'staging';
  port: number;
  containerName: string;
  dbContainerName?: string;
  status: 'running' | 'exited' | 'absent' | string;
  dockerStatus: string;
  createdAt: string | null;
  ttlDays: number | null;
  withSsl: boolean;
  dbName?: string;
}

export interface SystemStats {
  cpu: { percent: number; cores: number };
  ram: { usedMB: number; totalMB: number; percent: number };
  disk: { usedGB: number; totalGB: number; percent: number };
  network: { rxMB: number; txMB: number };
  timestamp: string;
}

export interface ContainerStats {
  name: string;
  cpuPercent: number;
  memUsageMB: number;
  memLimitMB: number;
  memPercent: number;
}

export interface Backup {
  filename: string;
  sizeMB: number;
  createdAt: string;
}

export interface DeployHistoryEntry {
  id: number;
  target: 'staging' | 'production';
  status: 'started' | 'success' | 'failed';
  startedAt: string;
  finishedAt?: string;
  exitCode?: number;
  triggeredBy: string;
}

export interface SslCert {
  domain: string;
  expiresAt: string | null;
  issuedAt: string | null;
  daysLeft: number | null;
  isSelfSigned: boolean;
  status: 'ok' | 'warning' | 'critical' | 'unknown' | 'error';
  error?: string;
}

export interface SetupStatus {
  productionDeployed: boolean;
  domainProd: string | null;
  domainStaging: string | null;
  domainDashboard: string | null;
  sslEmail: string | null;
  serverIp: string | null;
}

export interface GitStatus {
  branch: string;
  lastCommit: { hash: string; message: string; author: string; date: string } | null;
  recentCommits: { hash: string; message: string; author: string; date: string }[];
  isDirty: boolean;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
}
