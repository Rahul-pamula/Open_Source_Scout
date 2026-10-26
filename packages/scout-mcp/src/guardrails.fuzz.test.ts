import test from 'node:test';
import assert from 'node:assert';
import { CommandBoundaryGuard } from './guardrails.js';

test('CommandBoundaryGuard Security Fuzzing Suite (50+ Adversarial Payloads)', async (t) => {
  const adversarialPayloads: string[] = [
    // 1-10: Basic directory escapes & traversal
    'cd ..',
    'cd ../..',
    'cd ../../..',
    'cd src/..',
    'cd src/components/../../..',
    'pushd ..',
    'pushd ../..',
    'cd /',
    'cd /etc',
    'cd /var/log',

    // 11-20: Root / home / drive escapes
    'cd ~',
    'cd ~/projects',
    'cd $HOME',
    'cd \\..\\..',
    'cd ..\\..',
    'cd C:\\',
    'cd C:\\Windows\\System32',
    'cd D:/secrets',
    'pushd /etc/nginx',
    'pushd ~',

    // 21-30: Chained operators with escape vectors
    'ls -la && cd ..',
    'npm run build && cd /',
    'cat file.txt; cd ../..',
    'echo error || cd /etc',
    'echo hi | cd ..',
    'echo test\ncd ..',
    'git status\ncd /var',
    'pwd; pushd ..',
    'test -f foo && cd ~',
    'true; true; cd ..',

    // 31-40: Destructive system deletion commands
    'rm -rf /',
    'rm -rf /*',
    'rm -fr /',
    'rm -fr /*',
    'rm -rf ~',
    'rm -rf $HOME',
    'rm -rf /etc',
    'rm -rf /boot',
    'rm -rf /sys',
    'rm -rf /root',

    // 41-48: Block devices, formatters, and forkbombs
    'mkfs /dev/sda1',
    'mkfs.ext4 /dev/sda',
    'mkfs.vfat /dev/nvme0n1',
    'dd if=/dev/zero of=/dev/sda',
    'dd if=/dev/urandom of=/dev/sdb bs=1M',
    ':(){ :|:& };:',
    ':() { :|:& };:',
    ':(){ :|:&};:',

    // 49-55: Subshell & command substitution escapes
    'echo $(cd .. && pwd)',
    'echo $(cd /etc && cat passwd)',
    'echo `cd .. && ls`',
    'VAR=`cd ../.. && pwd`',
    'OUTPUT=$(pushd .. && ls)',
    'TEST=$(rm -rf /)',
    'TEST=`mkfs /dev/sda`',
  ];

  await t.test(`rejects all ${adversarialPayloads.length} adversarial command vectors`, () => {
    assert.ok(adversarialPayloads.length >= 50, `Expected 50+ payloads, got ${adversarialPayloads.length}`);
    for (const payload of adversarialPayloads) {
      assert.throws(
        () => CommandBoundaryGuard.validate(payload),
        (err: any) => {
          assert.strictEqual(err.name, 'GuardrailError');
          return true;
        },
        `Failed to reject adversarial payload: "${payload}"`,
      );
    }
  });

  const legitimateBuildCommands: string[] = [
    'npm test',
    'npm run build',
    'npm install --frozen-lockfile',
    'pnpm test',
    'pnpm build',
    'yarn test',
    'cargo build --release',
    'cargo test --all',
    'go test ./...',
    'go build -v .',
    'pytest tests/',
    'python3 -m pytest',
    'git status',
    'git rev-parse HEAD',
    'git diff HEAD~1',
    'cd src && npm test',
    'cd src/components && ls -la',
    'cd ./packages/scout-mcp && npm run build',
    'echo "All tests passed successfully"',
    'cat package.json | grep version',
    'echo $(date)',
    'echo $(git rev-parse HEAD)',
  ];

  await t.test('permits legitimate developer and build commands without false positives', () => {
    for (const cmd of legitimateBuildCommands) {
      assert.doesNotThrow(() => CommandBoundaryGuard.validate(cmd), `Legitimate command falsely rejected: "${cmd}"`);
    }
  });
});
