import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'child_process';
import { getGitDiff, getChangedFiles } from './git.js';

test('Git Untracked Diff & Evidence Capture Test Suite', async (t) => {
  let tmpRepo: string;

  t.beforeEach(async () => {
    tmpRepo = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-untracked-diff-'));
    execSync('git init', { cwd: tmpRepo });
    execSync('git config user.name "Scout Test" && git config user.email "test@scout.local"', { cwd: tmpRepo });

    // Initial commit so HEAD exists
    await fs.writeFile(path.join(tmpRepo, 'initial.txt'), 'base repository content\n');
    execSync('git add initial.txt && git commit -m "initial commit"', { cwd: tmpRepo });
  });

  t.afterEach(async () => {
    await fs.rm(tmpRepo, { recursive: true, force: true });
  });

  await t.test('captures newly created untracked file in getGitDiff', async () => {
    const newFilePath = path.join(tmpRepo, 'feature.ts');
    await fs.writeFile(newFilePath, 'export const feature = () => "awesome";\n');

    const diff = await getGitDiff(tmpRepo);
    assert.ok(diff.includes('diff --git a/feature.ts b/feature.ts'), 'Diff should contain feature.ts header');
    assert.ok(diff.includes('new file mode 100644'), 'Diff should indicate new file mode');
    assert.ok(diff.includes('+export const feature = () => "awesome";'), 'Diff should include file content');

    const changedFiles = await getChangedFiles(tmpRepo);
    assert.ok(changedFiles.includes('feature.ts'), 'Changed files list should include feature.ts');
  });

  await t.test('captures untracked files inside nested directories', async () => {
    const nestedDir = path.join(tmpRepo, 'src', 'components', 'button');
    await fs.mkdir(nestedDir, { recursive: true });
    await fs.writeFile(path.join(nestedDir, 'Button.tsx'), 'export const Button = () => <button>Click</button>;\n');

    const diff = await getGitDiff(tmpRepo);
    assert.ok(diff.includes('diff --git a/src/components/button/Button.tsx b/src/components/button/Button.tsx'));
    assert.ok(diff.includes('+export const Button = () => <button>Click</button>;'));

    const changedFiles = await getChangedFiles(tmpRepo);
    assert.ok(changedFiles.includes('src/components/button/Button.tsx'));
  });

  await t.test('strictly respects .gitignore for untracked files', async () => {
    // Add .gitignore
    await fs.writeFile(path.join(tmpRepo, '.gitignore'), 'node_modules/\n*.secret\n');
    execSync('git add .gitignore && git commit -m "add gitignore"', { cwd: tmpRepo });

    // Create ignored files and a legitimate untracked file
    const nodeModulesDir = path.join(tmpRepo, 'node_modules', 'dep');
    await fs.mkdir(nodeModulesDir, { recursive: true });
    await fs.writeFile(path.join(nodeModulesDir, 'package.json'), '{}');
    await fs.writeFile(path.join(tmpRepo, 'api.secret'), 'PRIVATE_KEY=123');

    const legitimateFile = path.join(tmpRepo, 'service.ts');
    await fs.writeFile(legitimateFile, 'export class Service {}\n');

    const diff = await getGitDiff(tmpRepo);
    assert.ok(diff.includes('service.ts'));
    assert.ok(!diff.includes('node_modules'));
    assert.ok(!diff.includes('api.secret'));

    const changedFiles = await getChangedFiles(tmpRepo);
    assert.deepStrictEqual(changedFiles, ['service.ts']);
  });
});
