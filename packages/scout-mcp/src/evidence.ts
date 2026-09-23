import fs from 'fs/promises';
import path from 'path';

export interface CommandEvidence {
  command: string;
  exitCode: number | null;
  timestamp: string;
}

export interface Evidence {
  commands: CommandEvidence[];
  changedFiles: string[];
  gitDiff: string;
  validationResults: any;
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
      validationResults: null
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

export async function recordCommand(sessionId: string, command: string, exitCode: number | null, timestamp: string): Promise<void> {
  const evidence = await getEvidence(sessionId);
  evidence.commands.push({ command, exitCode, timestamp });
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
