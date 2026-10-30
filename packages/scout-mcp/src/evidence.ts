import fs from 'fs/promises';
import path from 'path';

export interface ProcessMetrics {
  duration_ms?: number;
  cpu_user_micros?: number;
  cpu_system_micros?: number;
  peak_memory_rss_bytes?: number;
}

export interface SessionTelemetry {
  total_command_duration_ms: number;
  peak_rss_bytes: number;
  last_recorded_at?: string;
}

export interface CommandEvidence {
  command: string;
  exitCode: number | null;
  timestamp: string;
  telemetry?: ProcessMetrics;
}

export interface Evidence {
  commands: CommandEvidence[];
  changedFiles: string[];
  gitDiff: string;
  validationResults: any;
  telemetry?: SessionTelemetry;
}

const LOCAL_STATE_DIR = path.join(process.cwd(), '.scout-tmp');

function getEvidenceFilePath(sessionId: string): string {
  return path.join(LOCAL_STATE_DIR, 'sessions', sessionId, 'evidence.json');
}

export async function getEvidence(sessionId: string): Promise<Evidence> {
  const filePath = getEvidenceFilePath(sessionId);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {
      commands: [],
      changedFiles: [],
      gitDiff: '',
      validationResults: null,
    };
  }
}

export async function saveEvidence(sessionId: string, evidence: Evidence): Promise<void> {
  const filePath = getEvidenceFilePath(sessionId);
  const dirPath = path.dirname(filePath);
  await fs.mkdir(dirPath, { recursive: true });
  const tmpFile = `${filePath}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(evidence, null, 2), 'utf8');
  await fs.rename(tmpFile, filePath);
}

export async function recordCommand(
  sessionId: string,
  command: string,
  exitCode: number | null,
  timestamp: string,
  telemetry?: ProcessMetrics,
): Promise<void> {
  const evidence = await getEvidence(sessionId);
  evidence.commands.push({
    command,
    exitCode,
    timestamp,
    ...(telemetry ? { telemetry } : {}),
  });

  if (telemetry) {
    if (!evidence.telemetry) {
      evidence.telemetry = {
        total_command_duration_ms: 0,
        peak_rss_bytes: 0,
      };
    }
    if (telemetry.duration_ms) {
      evidence.telemetry.total_command_duration_ms += telemetry.duration_ms;
    }
    if (telemetry.peak_memory_rss_bytes) {
      evidence.telemetry.peak_rss_bytes = Math.max(
        evidence.telemetry.peak_rss_bytes,
        telemetry.peak_memory_rss_bytes,
      );
    }
    evidence.telemetry.last_recorded_at = new Date().toISOString();
  }

  await saveEvidence(sessionId, evidence);
}

export async function recordSessionTelemetry(
  sessionId: string,
  metrics: Partial<SessionTelemetry>,
): Promise<void> {
  const evidence = await getEvidence(sessionId);
  evidence.telemetry = {
    total_command_duration_ms:
      metrics.total_command_duration_ms ?? evidence.telemetry?.total_command_duration_ms ?? 0,
    peak_rss_bytes: Math.max(evidence.telemetry?.peak_rss_bytes ?? 0, metrics.peak_rss_bytes ?? 0),
    last_recorded_at: metrics.last_recorded_at ?? new Date().toISOString(),
  };
  await saveEvidence(sessionId, evidence);
}

export async function recordChangedFiles(sessionId: string, files: string[]): Promise<void> {
  const evidence = await getEvidence(sessionId);
  evidence.changedFiles = files;
  await saveEvidence(sessionId, evidence);
}

export async function recordGitDiff(sessionId: string, diff: string): Promise<void> {
  const evidence = await getEvidence(sessionId);
  evidence.gitDiff = diff;
  await saveEvidence(sessionId, evidence);
}

export async function recordValidationResults(sessionId: string, results: any): Promise<void> {
  const evidence = await getEvidence(sessionId);
  evidence.validationResults = results;
  await saveEvidence(sessionId, evidence);
}
