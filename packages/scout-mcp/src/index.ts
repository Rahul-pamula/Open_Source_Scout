import { recordChangedFiles, recordGitDiff, recordValidationResults } from './evidence.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createWorktree, getGitInfo, removeWorktree, getWorktreePath  , getGitDiff, getChangedFiles } from './git.js';
import { processManager } from './harness.js';
import { loadSkills } from './skills.js';
import { getSupabaseClient, getOrCreateTaskSession, fetchTaskInfo, updateSessionStatus, getSessionStatus, checkSubmitIdempotency, processMarkBlocked, getUserIdFromJwt, updateSessionHeartbeat } from './supabase.js';
import { runAdvisoryValidation } from './validation.js';
import { validatePathBoundary } from './guardrails.js';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { getOrCreateLocalSession, processLocalSubmit, processLocalMarkBlocked, updateLocalHeartbeat, checkStaleSessions, findStaleSession } from './localState.js';

const server = new Server({
  name: 'scout-mcp',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

const InitializeExecutionSchema = z.object({
  task_description: z.string(),
  task_id: z.string().optional(),
  source: z.string().optional().default('manual'),
});

const SubmitForReviewSchema = z.object({
  session_id: z.string().uuid(),
  pr_url: z.string().optional(),
});

const MarkBlockedSchema = z.object({
  session_id: z.string().uuid(),
  reason: z.string(),
});

const RunCommandSchema = z.object({
  session_id: z.string().uuid(),
  command: z.string(),
  cwd: z.string().optional(),
});

const CancelSessionSchema = z.object({
  session_id: z.string().uuid(),
});


const ReadFileSchema = z.object({
  session_id: z.string().uuid(),
  path: z.string(),
});

const WriteFileSchema = z.object({
  session_id: z.string().uuid(),
  path: z.string(),
  content: z.string(),
});

const EditFileSchema = z.object({
  session_id: z.string().uuid(),
  path: z.string(),
  search: z.string(),
  replace: z.string(),
});

const SessionHeartbeatSchema = z.object({
  session_id: z.string().uuid(),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [

      {
        name: 'read_file',
        description: 'Read the contents of a file within the worktree.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The UUID of the active session.' },
            path: { type: 'string', description: 'Path to the file to read (relative to worktree or absolute).' },
          },
          required: ['session_id', 'path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write contents to a file within the worktree. Overwrites if exists.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The UUID of the active session.' },
            path: { type: 'string', description: 'Path to the file to write (relative to worktree or absolute).' },
            content: { type: 'string', description: 'File content.' },
          },
          required: ['session_id', 'path', 'content'],
        },
      },
      {
        name: 'edit_file',
        description: 'Edit a file within the worktree by replacing exact text.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The UUID of the active session.' },
            path: { type: 'string', description: 'Path to the file to edit (relative to worktree or absolute).' },
            search: { type: 'string', description: 'Exact text to search for.' },
            replace: { type: 'string', description: 'Text to replace it with.' },
          },
          required: ['session_id', 'path', 'search', 'replace'],
        },
      },
      {
        name: 'run_command',
        description: 'Execute a shell command inside the session\'s worktree.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The UUID of the active session.' },
            command: { type: 'string', description: 'The shell command to execute.' },
          },
          required: ['session_id', 'command'],
        },
      },
      {
        name: 'cancel_session',
        description: 'Cleanly terminate all running processes for a session.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The UUID of the session.' },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'initialize_execution',
        description: 'Initialize a new execution session with a task description.',
        inputSchema: {
          type: 'object',
          properties: {
            task_description: { type: 'string', description: 'The description of the task to perform.' },
            task_id: { type: 'string', description: 'Optional cloud task ID.' },
            source: { type: 'string', description: 'Source of the task (e.g. manual, cloud).' },
          },
          required: ['task_description'],
        },
      },
      {
        name: 'cleanup_session',
        description: 'Clean up the git worktree for a given session.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The UUID of the session to clean up.' },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'submit_for_review',
        description: 'Tell Scout the AI submitted its work for external review, perform advisory local checks.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The UUID of the active session.' },
            pr_url: { type: 'string', description: 'Optional PR URL if available.' },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'session_heartbeat',
        description: 'Send a periodic heartbeat to indicate the session is still active.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The UUID of the active session.' },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'mark_blocked',
        description: 'Record that the AI cannot safely continue.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'The UUID of the active session.' },
            reason: { type: 'string', description: 'The reason why the task is blocked.' },
          },
          required: ['session_id', 'reason'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const supabase = getSupabaseClient();
    // User JWT is only needed if supabase is active. We fetch it lazily or safely if supabase exists.
    const userId = supabase && process.env.SCOUT_USER_JWT ? await getUserIdFromJwt(process.env.SCOUT_USER_JWT).catch(() => 'local-user') : 'local-user';

    switch (request.params.name) {
      case 'initialize_execution': {
        const { task_description, task_id, source } = InitializeExecutionSchema.parse(request.params.arguments);

        const gitInfo = await getGitInfo();

        // Run stale-session detection before creating anything new.
        await checkStaleSessions();
        const staleSessionId = await findStaleSession();
        if (staleSessionId) {
          console.error(`[lifecycle] Detected stale session ${staleSessionId}. Creating a fresh session.`);
        }

        const sessionId = randomUUID();

        // Save local state (new session always gets a fresh heartbeat timestamp).
        await getOrCreateLocalSession(sessionId, gitInfo.commitHash, task_description, source, task_id);

        const worktreePath = await createWorktree(sessionId);
        const skills = loadSkills();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              task: { description: task_description },
              session_id: sessionId,
              starting_commit_hash: gitInfo.commitHash,
              skills: skills,
              worktree_path: worktreePath,
              recovered_from_stale_session: staleSessionId ?? undefined,
              system_instructions: "IMPORTANT: You must use the 'read_file', 'write_file', 'edit_file', and 'run_command' MCP tools provided by scout-mcp to interact with the codebase. Do not use host IDE tools."
            }, null, 2)
          }]
        };
      }


      case 'run_command': {
        const { session_id, command, cwd } = RunCommandSchema.parse(request.params.arguments);
        const worktreePath = await getWorktreePath(session_id);
        
        let validatedCwd = worktreePath;
        if (cwd) {
          validatedCwd = validatePathBoundary(worktreePath, cwd);
        }
        
        const result = await processManager.runCommand(session_id, command, validatedCwd);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
      case 'read_file': {
        const { session_id, path } = ReadFileSchema.parse(request.params.arguments);
        const worktreePath = await getWorktreePath(session_id);
        const validatedPath = validatePathBoundary(worktreePath, path);
        
        const fileContent = await fs.readFile(validatedPath, 'utf8');
        return {
          content: [{
            type: 'text',
            text: fileContent
          }]
        };
      }

      case 'write_file': {
        const { session_id, path, content: fileContent } = WriteFileSchema.parse(request.params.arguments);
        const worktreePath = await getWorktreePath(session_id);
        const validatedPath = validatePathBoundary(worktreePath, path);
        
        await fs.writeFile(validatedPath, fileContent, 'utf8');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ message: 'File written successfully.' })
          }]
        };
      }

      case 'edit_file': {
        const { session_id, path, search, replace } = EditFileSchema.parse(request.params.arguments);
        const worktreePath = await getWorktreePath(session_id);
        const validatedPath = validatePathBoundary(worktreePath, path);
        
        const fileContent = await fs.readFile(validatedPath, 'utf8');
        if (!fileContent.includes(search)) {
          throw new Error('Search string not found in file.');
        }
        const newContent = fileContent.replace(search, replace);
        await fs.writeFile(validatedPath, newContent, 'utf8');
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ message: 'File edited successfully.' })
          }]
        };
      }

      case 'cancel_session': {
        const { session_id } = CancelSessionSchema.parse(request.params.arguments);
        
        await processManager.cancelSession(session_id);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Successfully cancelled session processes.',
            }, null, 2)
          }]
        };
      }

      case 'cleanup_session': {
        const CleanupSessionSchema = z.object({
          session_id: z.string().uuid(),
        });
        const { session_id } = CleanupSessionSchema.parse(request.params.arguments);
        
        await processManager.cancelSession(session_id);
        await removeWorktree(session_id);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Successfully cleaned up session processes and worktree.',
            }, null, 2)
          }]
        };
      }

      case 'submit_for_review': {
        const { session_id, pr_url } = SubmitForReviewSchema.parse(request.params.arguments);
        
        const { idempotent } = await processLocalSubmit(session_id, pr_url);
        if (idempotent) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: 'Successfully recorded submission attempt. (Idempotent)',
              }, null, 2)
            }]
          };
        }
        
        const worktreePath = await getWorktreePath(session_id);
        const diff = await getGitDiff(worktreePath);
        const changedFiles = await getChangedFiles(worktreePath);
        
        await recordGitDiff(session_id, diff);
        await recordChangedFiles(session_id, changedFiles);

        const validationResult = await runAdvisoryValidation();
        await recordValidationResults(session_id, validationResult);
        
        if (supabase && process.env.SCOUT_USER_JWT) {
           try {
             const isIdempotentCloud = await checkSubmitIdempotency(supabase, session_id, userId);
             if (!isIdempotentCloud) {
               await updateSessionStatus(supabase, session_id, userId, 'SUBMITTED', 'ACTIVE', pr_url);
             }
           } catch (e) {
             console.error("Cloud sync failed for submit_for_review:", e);
           }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Successfully recorded submission attempt.',
              advisory_validation: validationResult
            }, null, 2)
          }]
        };
      }

      case 'session_heartbeat': {
        const { session_id } = SessionHeartbeatSchema.parse(request.params.arguments);

        // Update heartbeat in local state first (works even without cloud connectivity).
        const found = await updateLocalHeartbeat(session_id);
        if (!found) {
          console.error(`[lifecycle] session_heartbeat called for unknown session ${session_id}`);
        }

        if (supabase && process.env.SCOUT_USER_JWT) {
           try {
             await updateSessionHeartbeat(supabase, session_id, userId);
           } catch (e) {
             console.error("Cloud sync failed for session_heartbeat:", e);
           }
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'Heartbeat recorded successfully.'
            }, null, 2)
          }]
        };
      }

      case 'mark_blocked': {
        const { session_id, reason } = MarkBlockedSchema.parse(request.params.arguments);
        
        const { idempotent } = await processLocalMarkBlocked(session_id, reason);

        if (supabase && process.env.SCOUT_USER_JWT) {
           try {
             await processMarkBlocked(supabase, session_id, userId);
           } catch (e) {
             console.error("Cloud sync failed for mark_blocked:", e);
           }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: idempotent ? 'Successfully marked session as blocked. (Idempotent)' : 'Successfully marked session as blocked.',
              reason
            }, null, 2)
          }]
        };
      }

      default:
        throw new Error('Unknown tool');
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Scout MCP Server running on stdio');
}

run().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
