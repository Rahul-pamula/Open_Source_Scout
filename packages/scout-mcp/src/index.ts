#!/usr/bin/env node
/**
 * Scout MCP Server — thin interface layer.
 *
 * All business logic lives in LocalHarness.  This file is responsible only
 * for:
 *   - Defining MCP tool schemas.
 *   - Parsing and validating incoming tool arguments.
 *   - Delegating to LocalHarness (and optionally to Supabase for cloud sync).
 *   - Formatting MCP responses.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { validatePathBoundary, GuardrailError } from './guardrails.js';
import { getWorktreePath } from './git.js';
import { fileURLToPath } from 'url';
import { LocalHarness } from './harness/LocalHarness.js';
import { getLocalState } from './localState.js';

const localHarness = new LocalHarness();
export const sessionWorkspaces = new Map<string, string>();

/**
 * Hydrate in-memory sessionWorkspaces map from persisted state.json on disk.
 * Returns the count of active sessions restored.
 */
export async function hydrateSessionWorkspaces(cwd: string = process.cwd()): Promise<number> {
  try {
    const state = await getLocalState(cwd);
    let count = 0;
    for (const [id, session] of Object.entries(state.sessions)) {
      if (session.workspace_path && (session.status === 'ACTIVE' || session.status === 'BLOCKED')) {
        sessionWorkspaces.set(id, session.workspace_path);
        count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

// Auto-hydrate on bootstrap
hydrateSessionWorkspaces().catch(() => {});

async function resolveSessionWorkspace(sessionId: string, fallbackCwd: string = process.cwd()): Promise<string> {
  const cached = sessionWorkspaces.get(sessionId);
  if (cached) return cached;
  try {
    const state = await getLocalState(fallbackCwd);
    const session = state.sessions[sessionId];
    if (session?.workspace_path) {
      sessionWorkspaces.set(sessionId, session.workspace_path);
      return session.workspace_path;
    }
  } catch {}
  return fallbackCwd;
}
import fs from 'fs/promises';
import path from 'path';

// ---------------------------------------------------------------------------
// MCP Server bootstrap
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'scout-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const InitializeExecutionSchema = z.object({
  task_description: z.string(),
  task_id: z.string().optional(),
  source: z.string().optional().default('manual'),
  cwd: z.string().optional(),
  client_id: z.string().optional(),
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

const CleanupSessionSchema = z.object({
  session_id: z.string().uuid(),
});

const GetSessionInfoSchema = z.object({
  session_id: z.string().uuid(),
});

const PingSchema = z.object({
  message: z.string().optional(),
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

// ---------------------------------------------------------------------------
// Tool list
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
      description: "Execute a shell command inside the session's worktree.",
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
          cwd: { type: 'string', description: 'Absolute path to the target repository workspace.' },
        },
        required: ['task_description', 'cwd'],
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
      name: 'get_session_info',
      description: 'Get status and metadata for an active or past Scout session.',
      inputSchema: {
        type: 'object',
        properties: {
          session_id: { type: 'string', description: 'The UUID of the session.' },
        },
        required: ['session_id'],
      },
    },
    {
      name: 'ping',
      description: 'Diagnostic keep-alive check to verify Scout MCP server responsiveness and uptime.',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Optional echo message.' },
        },
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
}));

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {


    switch (request.params.name) {
      // -----------------------------------------------------------------------
      case 'initialize_execution': {
        const { task_description, task_id, source, cwd } = InitializeExecutionSchema.parse(
          request.params.arguments,
        );

        const result = await localHarness.initializeExecution(
          task_description,
          source,
          task_id,
          cwd
        );

        if (cwd) {
          sessionWorkspaces.set(result.session_id, cwd);
        }

        if (result.recovered_from_stale_session) {
          return {
            content: [{
              type: 'text',
              text: `Session recovered successfully. Previous changes preserved:

${result.recovered_diff}

${JSON.stringify(result, null, 2)}`
            }],
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // -----------------------------------------------------------------------
      case 'run_command': {
        const { session_id, command, cwd } = RunCommandSchema.parse(request.params.arguments);
        const repoCwd = await resolveSessionWorkspace(session_id);
        const worktreePath = await getWorktreePath(session_id, repoCwd);

        let validatedCwd = worktreePath;
        if (cwd) {
          validatedCwd = validatePathBoundary(worktreePath, cwd);
        }

        const result = await localHarness.runCommand(session_id, command, validatedCwd);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // -----------------------------------------------------------------------
      case 'read_file': {
        const { session_id, path } = ReadFileSchema.parse(request.params.arguments);
        const repoCwd = await resolveSessionWorkspace(session_id);
        const worktreePath = await getWorktreePath(session_id, repoCwd);
        const validatedPath = validatePathBoundary(worktreePath, path);

        const fileContent = await fs.readFile(validatedPath, 'utf8');
        return { content: [{ type: 'text', text: fileContent }] };
      }

      // -----------------------------------------------------------------------
      case 'write_file': {
        const { session_id, path: targetPath, content: fileContent } = WriteFileSchema.parse(
          request.params.arguments,
        );
        const repoCwd = await resolveSessionWorkspace(session_id);
        const worktreePath = await getWorktreePath(session_id, repoCwd);
        const validatedPath = validatePathBoundary(worktreePath, targetPath);

        await fs.mkdir(path.dirname(validatedPath), { recursive: true });
        await fs.writeFile(validatedPath, fileContent, 'utf8');
        return {
          content: [{ type: 'text', text: JSON.stringify({ message: 'File written successfully.' }) }],
        };
      }

      // -----------------------------------------------------------------------
      case 'edit_file': {
        const { session_id, path, search, replace } = EditFileSchema.parse(request.params.arguments);
        const repoCwd = await resolveSessionWorkspace(session_id);
        const worktreePath = await getWorktreePath(session_id, repoCwd);
        const validatedPath = validatePathBoundary(worktreePath, path);

        const fileContent = await fs.readFile(validatedPath, 'utf8');
        if (!fileContent.includes(search)) {
          throw new Error('Search string not found in file.');
        }
        const newContent = fileContent.replace(search, replace);
        await fs.writeFile(validatedPath, newContent, 'utf8');

        return {
          content: [{ type: 'text', text: JSON.stringify({ message: 'File edited successfully.' }) }],
        };
      }

      // -----------------------------------------------------------------------
      case 'cancel_session': {
        const { session_id } = CancelSessionSchema.parse(request.params.arguments);
        await localHarness.cancelSession(session_id);
        sessionWorkspaces.delete(session_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: 'Successfully cancelled session processes.' }, null, 2),
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      case 'cleanup_session': {
        const { session_id } = CleanupSessionSchema.parse(request.params.arguments);
        await localHarness.cleanupSession(session_id);
        sessionWorkspaces.delete(session_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { message: 'Successfully cleaned up session processes and worktree.' },
                null,
                2,
              ),
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      case 'get_session_info': {
        const { session_id } = GetSessionInfoSchema.parse(request.params.arguments);
        const state = await getLocalState();
        const session = state.sessions[session_id];
        if (!session) {
          throw new Error(`Session not found in local state: ${session_id}`);
        }
        const workspace_path = sessionWorkspaces.get(session_id) || session.workspace_path || process.cwd();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  session_id,
                  status: session.status,
                  starting_commit_hash: session.starting_commit_hash,
                  task_description: session.task_description,
                  source: session.source,
                  task_id: session.task_id,
                  pr_url: session.pr_url,
                  blocked_reason: session.blocked_reason,
                  last_heartbeat_at: session.last_heartbeat_at,
                  created_at: session.created_at,
                  client_id: session.client_id,
                  workspace_path,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      case 'ping': {
        const { message } = PingSchema.parse(request.params.arguments || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'pong',
                  echo: message || 'pong',
                  timestamp: new Date().toISOString(),
                  uptime_seconds: process.uptime(),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      case 'submit_for_review': {
        const { session_id, pr_url } = SubmitForReviewSchema.parse(request.params.arguments);
        const repoCwd = await resolveSessionWorkspace(session_id);
        const worktreePath = await getWorktreePath(session_id, repoCwd);

        const result = await localHarness.submitForReview(
          session_id,
          worktreePath,
          pr_url,
        );

        if (result.idempotent) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { message: 'Successfully recorded submission attempt. (Idempotent)' },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'Successfully recorded submission attempt.',
                  advisory_validation: result.advisory_validation,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      case 'session_heartbeat': {
        const { session_id } = SessionHeartbeatSchema.parse(request.params.arguments);

        await localHarness.sessionHeartbeat(session_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: 'Heartbeat recorded successfully.' }, null, 2),
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      case 'mark_blocked': {
        const { session_id, reason } = MarkBlockedSchema.parse(request.params.arguments);

        const result = await localHarness.markBlocked(session_id, reason);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: result.idempotent
                    ? 'Successfully marked session as blocked. (Idempotent)'
                    : 'Successfully marked session as blocked.',
                  reason,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return formatJsonRpcError(error);
  }
});

export enum McpErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ResourceNotFound = -32001,
  SessionNotFound = -32002,
  GuardrailViolation = -32003,
}

export function formatJsonRpcError(error: any) {
  let code = McpErrorCode.InternalError;
  let message = error?.message || 'Internal server error';
  let data: any = undefined;

  if (error instanceof z.ZodError) {
    code = McpErrorCode.InvalidParams;
    message = `Invalid parameters: ${error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    data = error.errors;
  } else if (message.includes('Unknown tool')) {
    code = McpErrorCode.MethodNotFound;
  } else if (
    error instanceof GuardrailError ||
    error?.name === 'GuardrailError' ||
    message.includes('boundary') ||
    message.includes('Escape') ||
    message.includes('denied') ||
    message.includes('blocked') ||
    message.includes('forbidden')
  ) {
    code = McpErrorCode.GuardrailViolation;
  } else if (error?.code === 'ENOENT' || message.includes('ENOENT') || message.includes('no such file')) {
    code = McpErrorCode.ResourceNotFound;
  } else if (message.includes('Session not found') || message.includes('STALE') || message.includes('CANCELLED')) {
    code = McpErrorCode.SessionNotFound;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            jsonrpc: '2.0',
            error: {
              code,
              message,
              ...(data ? { data } : {}),
            },
          },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Scout MCP Server running on stdio');
}

const isDirectExecution =
  process.argv[1] &&
  (process.argv[1] === fileURLToPath(import.meta.url) ||
    process.argv[1].endsWith('/index.js') ||
    process.argv[1].endsWith('/index.ts'));

if (isDirectExecution && !process.env.NODE_TEST_CONTEXT) {
  run().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
  });
}
