// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// src/git.ts
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
async function getGitInfo(cwd = process.cwd()) {
  try {
    await execAsync("git rev-parse --is-inside-work-tree", { cwd });
  } catch (e) {
    throw new Error("Not a git repository.");
  }
  try {
    const { stdout: originOut } = await execAsync("git remote get-url origin", { cwd });
    let remoteUrl = originOut.trim();
    if (remoteUrl.startsWith("git@github.com:")) {
      remoteUrl = remoteUrl.replace("git@github.com:", "https://github.com/");
    }
    if (remoteUrl.endsWith(".git")) {
      remoteUrl = remoteUrl.slice(0, -4);
    }
    const { stdout: branchOut } = await execAsync("git branch --show-current", { cwd });
    const branch = branchOut.trim();
    if (!branch) {
      throw new Error("Detached HEAD state. Please checkout a branch.");
    }
    const { stdout: commitOut } = await execAsync("git rev-parse HEAD", { cwd });
    const commitHash = commitOut.trim();
    return {
      remoteUrl,
      branch,
      commitHash
    };
  } catch (e) {
    throw new Error(`Git error: ${e.message}`);
  }
}
async function checkDirtyWorkingTree(cwd = process.cwd()) {
  const { stdout } = await execAsync("git status --porcelain", { cwd });
  if (stdout.trim().length > 0) {
    throw new Error("Working tree is dirty. Commit or stash changes before starting.");
  }
}

// src/skills.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";
function loadSkills(cwd = process.cwd()) {
  const skillsDir = path.join(cwd, ".scout", "skills");
  if (!fs.existsSync(skillsDir)) {
    return [];
  }
  const files = fs.readdirSync(skillsDir);
  const skills = [];
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const filePath = path.join(skillsDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    try {
      const parsed = matter(content);
      if (!parsed.data.name || !parsed.data.description) {
        throw new Error("Missing required frontmatter (name, description)");
      }
      skills.push({
        filename: file,
        name: parsed.data.name,
        description: parsed.data.description,
        content: parsed.content
      });
    } catch (e) {
      throw new Error(`Failed to parse skill file ${file}: ${e.message}`);
    }
  }
  return skills;
}

// src/supabase.ts
import { createClient } from "@supabase/supabase-js";
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const userJwt = process.env.SCOUT_USER_JWT;
  if (!url || !anonKey) {
    throw new Error("Authentication Failed: Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }
  if (!userJwt) {
    throw new Error("Authentication Failed: Missing SCOUT_USER_JWT token");
  }
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userJwt}`
      }
    }
  });
}
async function getOrCreateTaskSession(supabase, taskId, userId, commitHash) {
  const { data: existing, error: fetchError } = await supabase.from("task_sessions").select("id").eq("task_id", taskId).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (fetchError) {
    throw new Error(`Failed to query sessions: ${fetchError.message}`);
  }
  if (existing) {
    return existing.id;
  }
  const { data: newSession, error: insertError } = await supabase.from("task_sessions").insert({
    task_id: taskId,
    user_id: userId,
    starting_commit_hash: commitHash,
    status: "active"
  }).select("id").single();
  if (insertError) {
    if (insertError.code === "23505") {
      const { data: retryExisting } = await supabase.from("task_sessions").select("id").eq("task_id", taskId).eq("user_id", userId).eq("status", "active").single();
      if (retryExisting) return retryExisting.id;
    }
    throw new Error(`Failed to create task session: ${insertError.message}`);
  }
  return newSession.id;
}
async function fetchTaskInfo(supabase, taskId) {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();
  if (error || !data) {
    throw new Error(`Failed to fetch task: ${error?.message || "Not found"}`);
  }
  return data;
}
async function updateSessionStatus(supabase, sessionId, status) {
  const { error } = await supabase.from("task_sessions").update({ status }).eq("id", sessionId);
  if (error) {
    throw new Error(`Failed to update session status: ${error.message}`);
  }
}
async function getUserIdFromJwt(jwt) {
  try {
    const payloadBase64 = jwt.split(".")[1];
    const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf8");
    const payload = JSON.parse(payloadJson);
    return payload.sub;
  } catch (e) {
    throw new Error("Authentication Failed: Malformed SCOUT_USER_JWT token");
  }
}

// src/validation.ts
import { exec as exec2 } from "child_process";
import { promisify as promisify2 } from "util";
import fs2 from "fs";
import path2 from "path";
var execAsync2 = promisify2(exec2);
async function runAdvisoryValidation(cwd = process.cwd()) {
  const packageJsonPath = path2.join(cwd, "package.json");
  let command = "";
  if (fs2.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs2.readFileSync(packageJsonPath, "utf8"));
    if (pkg.scripts && pkg.scripts["scout:validate"]) {
      command = "npm run scout:validate";
    }
  }
  if (!command) {
    return {
      success: true,
      stdout: "No scout:validate script found in package.json. Skipping validation.",
      stderr: ""
    };
  }
  try {
    const { stdout, stderr } = await execAsync2(command, { cwd, timeout: 3e5 });
    return {
      success: true,
      stdout,
      stderr
    };
  } catch (e) {
    return {
      success: false,
      stdout: e.stdout || "",
      stderr: e.stderr || e.message || "Unknown error"
    };
  }
}

// src/index.ts
var server = new Server({
  name: "scout-mcp",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});
var GetTaskBlueprintSchema = z.object({
  task_id: z.string().uuid()
});
var SubmitForReviewSchema = z.object({
  session_id: z.string().uuid(),
  pr_url: z.string().optional()
});
var MarkBlockedSchema = z.object({
  session_id: z.string().uuid(),
  reason: z.string()
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_task_blueprint",
        description: "Return the structured context required for the AI to begin a task.",
        inputSchema: {
          type: "object",
          properties: {
            task_id: { type: "string", description: "The UUID of the task." }
          },
          required: ["task_id"]
        }
      },
      {
        name: "submit_for_review",
        description: "Tell Scout the AI submitted its work for external review, perform advisory local checks.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string", description: "The UUID of the active session." },
            pr_url: { type: "string", description: "Optional PR URL if available." }
          },
          required: ["session_id"]
        }
      },
      {
        name: "mark_blocked",
        description: "Record that the AI cannot safely continue.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string", description: "The UUID of the active session." },
            reason: { type: "string", description: "The reason why the task is blocked." }
          },
          required: ["session_id", "reason"]
        }
      }
    ]
  };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const supabase = getSupabaseClient();
    const userId = await getUserIdFromJwt(process.env.SCOUT_USER_JWT);
    switch (request.params.name) {
      case "get_task_blueprint": {
        const { task_id } = GetTaskBlueprintSchema.parse(request.params.arguments);
        const gitInfo = await getGitInfo();
        await checkDirtyWorkingTree();
        const sessionId = await getOrCreateTaskSession(supabase, task_id, userId, gitInfo.commitHash);
        const taskInfo = await fetchTaskInfo(supabase, task_id);
        const skills = loadSkills();
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              task: taskInfo,
              session_id: sessionId,
              starting_commit_hash: gitInfo.commitHash,
              skills
            }, null, 2)
          }]
        };
      }
      case "submit_for_review": {
        const { session_id } = SubmitForReviewSchema.parse(request.params.arguments);
        const validationResult = await runAdvisoryValidation();
        await updateSessionStatus(supabase, session_id, "submitted");
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              message: "Successfully recorded submission attempt.",
              advisory_validation: validationResult
            }, null, 2)
          }]
        };
      }
      case "mark_blocked": {
        const { session_id, reason } = MarkBlockedSchema.parse(request.params.arguments);
        await updateSessionStatus(supabase, session_id, "blocked");
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              message: "Successfully marked session as blocked.",
              reason
            }, null, 2)
          }]
        };
      }
      default:
        throw new Error("Unknown tool");
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
});
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Scout MCP Server running on stdio");
}
run().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
