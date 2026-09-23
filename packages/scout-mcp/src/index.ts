import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { checkDirtyWorkingTree, getGitInfo } from './git.js';
import { loadSkills } from './skills.js';
import { getSupabaseClient, getOrCreateTaskSession, fetchTaskInfo, updateSessionStatus, getSessionStatus, processSubmitForReview, processMarkBlocked, getUserIdFromJwt } from './supabase.js';
import { runAdvisoryValidation } from './validation.js';

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

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
        
        // 2. Enforce clean working tree
        await checkDirtyWorkingTree();

        // 3. Create or retrieve active session idempotently
        const sessionId = await getOrCreateTaskSession(supabase, task_id, userId, gitInfo.commitHash);

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
              skills: skills
            }, null, 2)
          }]
        };
      }

      case 'submit_for_review': {
        const { session_id } = SubmitForReviewSchema.parse(request.params.arguments);
        
        const { idempotent } = await processSubmitForReview(supabase, session_id, userId);

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

        // Run advisory local checks
        const validationResult = await runAdvisoryValidation();

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
