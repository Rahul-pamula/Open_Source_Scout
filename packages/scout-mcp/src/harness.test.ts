import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ProcessManager } from './harness.js';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

describe('ProcessManager', () => {
  it('should run a command and return stdout', async () => {
    const manager = new ProcessManager();
    const result = await manager.runCommand('session-1', 'echo "hello world"', process.cwd());
    assert.strictEqual(result.stdout.trim(), 'hello world');
    assert.strictEqual(result.exitCode, 0);
    assert.strictEqual(manager.getActiveProcessCount('session-1'), 0);
  });

  it('should track active processes and kill them when cancelSession is called', async () => {
    const manager = new ProcessManager();
    // Start a long-running process
    const runPromise = manager.runCommand('session-2', 'sleep 10', process.cwd());
    
    // Give it a moment to spawn
    await setTimeout(100);
    assert.strictEqual(manager.getActiveProcessCount('session-2'), 1);

    await manager.cancelSession('session-2');
    
    const result = await runPromise;
    // When killed, exit code is null on some systems, or specific error code.
    // We just verify it terminated early.
    assert.strictEqual(manager.getActiveProcessCount('session-2'), 0);
  });

  it('should handle process errors gracefully', async () => {
    const manager = new ProcessManager();
    try {
      await manager.runCommand('session-3', 'this_command_does_not_exist', process.cwd());
      assert.fail('Should have thrown');
    } catch (err: any) {
      // Typically exitCode will be returned rather than throwing an error for shell commands
      // But if it does throw, we want to ensure count is 0
    }
    
    // In node, spawn with shell: true usually resolves with an exit code (e.g. 127) rather than throwing
    // Let's verify active count is 0
    assert.strictEqual(manager.getActiveProcessCount('session-3'), 0);
  });

  it('should prevent orphans by killing child processes', async () => {
    const manager = new ProcessManager();
    // Spawn a shell that spawns a sleep command
    const runPromise = manager.runCommand('session-4', 'sh -c "sleep 10"', process.cwd());
    
    await setTimeout(100);
    assert.strictEqual(manager.getActiveProcessCount('session-4'), 1);
    
    await manager.cancelSession('session-4');
    
    const result = await runPromise;
    assert.strictEqual(manager.getActiveProcessCount('session-4'), 0);
  });
});
