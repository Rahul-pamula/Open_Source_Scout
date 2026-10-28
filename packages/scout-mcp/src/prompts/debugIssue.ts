/**
 * scout_debug_issue prompt implementation.
 * Guides autonomous coding agents and engineers through structured root cause analysis,
 * minimal reproductions, failure isolation, and targeted verification.
 */

import type { PromptDefinition, PromptMessage } from './architectMode.js';

export function generateDebugIssueMessages(args: Record<string, string>): PromptMessage[] {
  const issue = args.issue_description || 'Not specified';
  const logs = args.error_logs ? `\n\nError Traces & Logs:\n${args.error_logs}` : '';
  const file = args.failing_file ? `\n\nSuspected File/Module:\n${args.failing_file}` : '';

  const promptText = `You are Scout Debugger, a world-class debugging specialist and systems investigator.
Your mandate is to systematically diagnose regressions, runtime errors, and unexpected system behaviors through methodical root cause isolation.

Issue Details:
${issue}${file}${logs}

Debugging Protocol & Invariant Rules:
1. Reproduction First
   - Never modify production source code until a minimal reproduction script or failing unit test is established.
   - Run the reproduction to confirm the failure mode matches reported behavior.

2. Causality Tracing & Hypothesis Formulation
   - Trace backwards from the point of failure to the root trigger.
   - Distinguish symptoms from underlying architectural or logical causes.
   - Explicitly formulate 2-3 testable hypotheses before applying code changes.

3. Minimal Non-Destructive Patch
   - Apply the most focused, targeted edit possible to resolve the root defect.
   - Avoid unrelated cosmetic changes or architectural refactorings during a bug fix.

4. Comprehensive Regression Verification
   - Verify the reproduction test now passes.
   - Run the full project test suite and validate all touched boundary subsystems.

Deliver your systematic diagnosis, reproduction strategy, and surgical fix proposal now.`;

  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: promptText,
      },
    },
  ];
}

export const debugIssuePrompt: PromptDefinition = {
  name: 'scout_debug_issue',
  description:
    'Perform systematic root cause analysis, trace error logs, formulate hypotheses, and identify minimal bug reproductions.',
  arguments: [
    {
      name: 'issue_description',
      description: 'Detailed description of the bug, unexpected behavior, or regression',
      required: true,
    },
    {
      name: 'error_logs',
      description: 'Stack traces, runtime errors, or test failure output',
      required: false,
    },
    {
      name: 'failing_file',
      description: 'Suspected source file path or failing component',
      required: false,
    },
  ],
  generateMessages: generateDebugIssueMessages,
};
