/**
 * Session export and bundle generation.
 * Generates an offline tarball containing audit metadata, telemetry, evidence, diffs, and manifest.
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getLocalState } from './localState.js';
import { getEvidence, getTimelineEvents } from './evidence.js';

const execFileAsync = promisify(execFile);

export interface ExportBundleResult {
  bundlePath: string;
  sizeBytes: number;
  filesIncluded: string[];
  sha256: string;
  format: 'tar.gz' | 'json';
}

/**
 * Computes SHA256 hash of a file on disk.
 */
async function computeSha256(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Exports all session evidence, metadata, git diffs, and timeline into an offline archive bundle.
 */
export async function exportSessionBundle(
  sessionId: string,
  outputPath?: string,
  cwd: string = process.cwd(),
): Promise<ExportBundleResult> {
  const state = await getLocalState(cwd);
  const session = state.sessions[sessionId];
  const evidence = await getEvidence(sessionId);
  const timeline = await getTimelineEvents(sessionId);

  const baseDir = path.join(cwd, '.scout-tmp', 'sessions', sessionId);
  const stagingDir = path.join(baseDir, `bundle-staging-${Date.now()}`);
  await fs.mkdir(stagingDir, { recursive: true });

  const filesIncluded: string[] = [];

  try {
    // 1. Session state metadata
    const sessionFile = path.join(stagingDir, 'session.json');
    await fs.writeFile(
      sessionFile,
      JSON.stringify(
        {
          sessionId,
          status: session?.status || 'UNKNOWN',
          taskDescription: session?.task_description,
          startingCommit: session?.starting_commit_hash,
          workspacePath: session?.workspace_path,
          createdAt: session?.created_at,
          lastHeartbeatAt: session?.last_heartbeat_at,
          prUrl: session?.pr_url,
          blockedReason: session?.blocked_reason,
        },
        null,
        2,
      ),
      'utf8',
    );
    filesIncluded.push('session.json');

    // 2. Full evidence records (commands, telemetry, validation)
    const evidenceFile = path.join(stagingDir, 'evidence.json');
    await fs.writeFile(evidenceFile, JSON.stringify(evidence, null, 2), 'utf8');
    filesIncluded.push('evidence.json');

    // 3. Chronological timeline events
    const timelineFile = path.join(stagingDir, 'timeline.json');
    await fs.writeFile(timelineFile, JSON.stringify(timeline, null, 2), 'utf8');
    filesIncluded.push('timeline.json');

    // 4. Git diff patch
    const patchFile = path.join(stagingDir, 'patch.diff');
    await fs.writeFile(patchFile, evidence.gitDiff || '', 'utf8');
    filesIncluded.push('patch.diff');

    // 5. Manifest file
    const manifestFile = path.join(stagingDir, 'manifest.json');
    const manifest = {
      manifestVersion: '1.0',
      sessionId,
      exportedAt: new Date().toISOString(),
      files: filesIncluded,
    };
    await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
    filesIncluded.push('manifest.json');

    const targetTarGz = outputPath || path.join(baseDir, `bundle-${sessionId}.tar.gz`);
    await fs.mkdir(path.dirname(targetTarGz), { recursive: true });

    let finalBundlePath = targetTarGz;
    let format: 'tar.gz' | 'json' = 'tar.gz';

    try {
      // Attempt to package via system tar
      await execFileAsync('tar', ['-czf', targetTarGz, '-C', stagingDir, '.']);
    } catch {
      // Fallback to unified JSON bundle if tar execution is unavailable
      const fallbackJsonPath = targetTarGz.endsWith('.tar.gz')
        ? targetTarGz.replace(/\.tar\.gz$/, '.bundle.json')
        : `${targetTarGz}.json`;
      const bundlePayload = {
        manifest,
        session: session || {},
        evidence,
        timeline,
        gitDiff: evidence.gitDiff || '',
      };
      await fs.writeFile(fallbackJsonPath, JSON.stringify(bundlePayload, null, 2), 'utf8');
      finalBundlePath = fallbackJsonPath;
      format = 'json';
    }

    const stat = await fs.stat(finalBundlePath);
    const sha256 = await computeSha256(finalBundlePath);

    return {
      bundlePath: finalBundlePath,
      sizeBytes: stat.size,
      filesIncluded,
      sha256,
      format,
    };
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}
