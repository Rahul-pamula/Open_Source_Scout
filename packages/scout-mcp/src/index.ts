import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createWorktree, getGitInfo, removeWorktree, getWorktreePath } from './git.js';
import { processManager } from './harness.js';
import { loadSkills } from './skills.js';
import { getSupabaseClient, getOrCreateTaskSession, fetchTaskInfo, updateSessionStatus, getSessionStatus, checkSubmitIdempotency, processMarkBlocked, getUserIdFromJwt, updateSessionHeartbeat } from './supabase.js';
import { runAdvisoryValidation } from './validation.js';
import { validatePathBoundary } from './guardrails.js';
import fs from 'fs/promises';

const server = new Server({
  name: 'scout-mcp',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

const GetTaskBlueprintSchema = z.object({
  task_id: z.string().uuid(),
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
        name: 'get_task_blueprint',
        description: 'Return the structured context required for the AI to begin a task.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'The UUID of the task.' },
          },
          required: ['task_id'],
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
    const userId = await getUserIdFromJwt(process.env.SCOUT_USER_JWT!);

    switch (request.params.name) {
      case 'get_task_blueprint': {
        const { task_id } = GetTaskBlueprintSchema.parse(request.params.arguments);
        
        // 1. Resolve Identity
        const gitInfo = await getGitInfo();
        
        // 2. Create or retrieve active session idempotently
        const sessionId = await getOrCreateTaskSession(supabase, task_id, userId, gitInfo.commitHash);

        // 3. Create unique git worktree for this session
        const worktreePath = await createWorktree(sessionId);

        // 4. Fetch task metadata
        const taskInfo = await fetchTaskInfo(supabase, task_id);

        // 5. Load and validate skills
        const skills = loadSkills();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              task: taskInfo,
              session_id: sessionId,
              starting_commit_hash: gitInfo.commitHash,
              skills: skills,
              worktree_path: worktreePath,
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
        
        const isIdempotent = await checkSubmitIdempotency(supabase, session_id, userId);

        if (isIdempotent) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                message: 'Successfully recorded submission attempt. (Idempotent)',
              }, null, 2)
            }]
          };
        }

        // Run advisory local checks BEFORE state transition
        const validationResult = await runAdvisoryValidation();

        // Perform optimistic DB update to SUBMITTED
        // We include pr_url to be saved on the tasks table
        await updateSessionStatus(supabase, session_id, userId, 'SUBMITTED', 'ACTIVE', pr_url);

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
        await updateSessionHeartbeat(supabase, session_id, userId);
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
        
        const { idempotent } = await processMarkBlocked(supabase, session_id, userId);

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
