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
import { validatePathBoundary } from './guardrails.js';
import { getWorktreePath } from './git.js';
import {
  getSupabaseClient,
  getOrCreateTaskSession,
  fetchTaskInfo,
  updateSessionStatus,
  getSessionStatus,
  checkSubmitIdempotency,
  processMarkBlocked,
  getUserIdFromJwt,
  updateSessionHeartbeat,
} from './supabase.js';
import { localHarness } from './harness/LocalHarness.js';
import fs from 'fs/promises';

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
}));

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    // Cloud client and user identity are resolved once per request.
    // Both are null/fallback when Supabase env vars are absent.
    const supabase = getSupabaseClient();
    const userId =
      supabase && process.env.SCOUT_USER_JWT
        ? await getUserIdFromJwt(process.env.SCOUT_USER_JWT).catch(() => 'local-user')
        : 'local-user';

    switch (request.params.name) {
      // -----------------------------------------------------------------------
      case 'initialize_execution': {
        const { task_description, task_id, source } = InitializeExecutionSchema.parse(
          request.params.arguments,
        );

        // Optional Supabase cloud sync: create a cloud session if connected.
        const cloudSync =
          supabase && task_id && process.env.SCOUT_USER_JWT
            ? async () => {
                await getOrCreateTaskSession(supabase, task_id, userId, '');
              }
            : undefined;

        const result = await localHarness.initializeExecution(
          task_description,
          source,
          task_id,
          cloudSync,
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // -----------------------------------------------------------------------
      case 'run_command': {
        const { session_id, command, cwd } = RunCommandSchema.parse(request.params.arguments);
        const worktreePath = await getWorktreePath(session_id);

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
        const worktreePath = await getWorktreePath(session_id);
        const validatedPath = validatePathBoundary(worktreePath, path);

        const fileContent = await fs.readFile(validatedPath, 'utf8');
        return { content: [{ type: 'text', text: fileContent }] };
      }

      // -----------------------------------------------------------------------
      case 'write_file': {
        const { session_id, path, content: fileContent } = WriteFileSchema.parse(
          request.params.arguments,
        );
        const worktreePath = await getWorktreePath(session_id);
        const validatedPath = validatePathBoundary(worktreePath, path);

        await fs.writeFile(validatedPath, fileContent, 'utf8');
        return {
          content: [{ type: 'text', text: JSON.stringify({ message: 'File written successfully.' }) }],
        };
      }

      // -----------------------------------------------------------------------
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
          content: [{ type: 'text', text: JSON.stringify({ message: 'File edited successfully.' }) }],
        };
      }

      // -----------------------------------------------------------------------
      case 'cancel_session': {
        const { session_id } = CancelSessionSchema.parse(request.params.arguments);
        await localHarness.cancelSession(session_id);

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
      case 'submit_for_review': {
        const { session_id, pr_url } = SubmitForReviewSchema.parse(request.params.arguments);
        const worktreePath = await getWorktreePath(session_id);

        // Cloud sync: update session status in Supabase after local submit.
        const cloudSync =
          supabase && process.env.SCOUT_USER_JWT
            ? async () => {
                const isIdempotentCloud = await checkSubmitIdempotency(supabase, session_id, userId);
                if (!isIdempotentCloud) {
                  await updateSessionStatus(supabase, session_id, userId, 'SUBMITTED', 'ACTIVE', pr_url);
                }
              }
            : undefined;

        const result = await localHarness.submitForReview(
          session_id,
          worktreePath,
          pr_url,
          cloudSync,
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

        // Cloud sync: update heartbeat in Supabase.
        const cloudSync =
          supabase && process.env.SCOUT_USER_JWT
            ? async () => {
                await updateSessionHeartbeat(supabase, session_id, userId);
              }
            : undefined;

        await localHarness.sessionHeartbeat(session_id, cloudSync);

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

        // Cloud sync: mark session blocked in Supabase.
        const cloudSync =
          supabase && process.env.SCOUT_USER_JWT
            ? async () => {
                await processMarkBlocked(supabase, session_id, userId);
              }
            : undefined;

        const result = await localHarness.markBlocked(session_id, reason, cloudSync);

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
        throw new Error('Unknown tool');
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Scout MCP Server running on stdio');
}

run().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
