import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { loadSkills } from './skills.js';

test('Skills Loader', async (t) => {
  const testDir = path.join(process.cwd(), '.test-scout-skills');
  const skillsDir = path.join(testDir, '.scout', 'skills');

  t.beforeEach(() => {
    fs.mkdirSync(skillsDir, { recursive: true });
  });

  t.afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  await t.test('loads valid skill', () => {
    fs.writeFileSync(path.join(skillsDir, 'valid.md'), '---\nname: Test\ndescription: A valid skill\n---\n# Content');
    const skills = loadSkills(testDir);
    assert.strictEqual(skills.length, 1);
    assert.strictEqual(skills[0].name, 'Test');
    assert.strictEqual(skills[0].description, 'A valid skill');
    assert.strictEqual(skills[0].content.trim(), '# Content');
  });

  await t.test('fails on missing name', () => {
    fs.writeFileSync(path.join(skillsDir, 'missing-name.md'), '---\ndescription: Missing name\n---\n# Content');
    assert.throws(() => loadSkills(testDir), /Missing required frontmatter/);
  });

  await t.test('fails on missing description', () => {
    fs.writeFileSync(path.join(skillsDir, 'missing-desc.md'), '---\nname: Test\n---\n# Content');
    assert.throws(() => loadSkills(testDir), /Missing required frontmatter/);
  });

  await t.test('fails on malformed frontmatter', () => {
    fs.writeFileSync(path.join(skillsDir, 'malformed.md'), '---\nname: [unclosed array\ndescription: Test\n---\n# Content');
    assert.throws(() => loadSkills(testDir), /Failed to parse skill file/);
  });

  await t.test('loads multiple skills', () => {
    fs.writeFileSync(path.join(skillsDir, '1.md'), '---\nname: A\ndescription: A\n---\nA');
    fs.writeFileSync(path.join(skillsDir, '2.md'), '---\nname: B\ndescription: B\n---\nB');
    const skills = loadSkills(testDir);
    assert.strictEqual(skills.length, 2);
  });
});
