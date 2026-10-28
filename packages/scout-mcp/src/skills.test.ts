import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadSkills,
  clearSkillCache,
  getSkillCacheStats,
  SkillLRUCache,
  parseSkillFrontmatter,
} from './skills.js';

test('Skills Loader', async (t) => {
  const testDir = path.join(process.cwd(), '.test-scout-skills');
  const skillsDir = path.join(testDir, '.scout', 'skills');

  t.beforeEach(() => {
    clearSkillCache();
    fs.mkdirSync(skillsDir, { recursive: true });
  });

  t.afterEach(() => {
    clearSkillCache();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  await t.test('loads valid skill', async () => {
    fs.writeFileSync(path.join(skillsDir, 'valid.md'), '---\nname: Test\ndescription: A valid skill\n---\n# Content');
    const skills = await loadSkills(testDir);
    assert.strictEqual(skills.length, 1);
    assert.strictEqual(skills[0].name, 'Test');
    assert.strictEqual(skills[0].description, 'A valid skill');
    assert.strictEqual(skills[0].content.trim(), '# Content');
  });

  await t.test('gracefully skips on missing name', async () => {
    fs.writeFileSync(path.join(skillsDir, 'missing-name.md'), '---\ndescription: Missing name\n---\n# Content');
    const skills = await loadSkills(testDir);
    assert.strictEqual(skills.length, 0);
  });

  await t.test('gracefully skips on missing description', async () => {
    fs.writeFileSync(path.join(skillsDir, 'missing-desc.md'), '---\nname: Test\n---\n# Content');
    const skills = await loadSkills(testDir);
    assert.strictEqual(skills.length, 0);
  });

  await t.test('gracefully skips on malformed frontmatter', async () => {
    fs.writeFileSync(path.join(skillsDir, 'malformed.md'), '---\nname: [unclosed array\ndescription: Test\n---\n# Content');
    const skills = await loadSkills(testDir);
    assert.strictEqual(skills.length, 0);
  });

  await t.test('loads multiple skills', async () => {
    fs.writeFileSync(path.join(skillsDir, '1.md'), '---\nname: A\ndescription: A\n---\nA');
    fs.writeFileSync(path.join(skillsDir, '2.md'), '---\nname: B\ndescription: B\n---\nB');
    const skills = await loadSkills(testDir);
    assert.strictEqual(skills.length, 2);
  });

  await t.test('filters and ranks skills by task description', async () => {
    fs.writeFileSync(path.join(skillsDir, 'git.md'), '---\nname: git-flow\ndescription: Manage git branches and commits\n---\nGit docs');
    fs.writeFileSync(path.join(skillsDir, 'docker.md'), '---\nname: docker-deploy\ndescription: Container deployment\n---\nDocker docs');
    const skills = await loadSkills('Help with git flow commits', testDir);
    assert.ok(skills.length >= 1);
    assert.strictEqual(skills[0].name, 'git-flow');
  });

  await t.test('avoids redundant YAML parsing on repeated calls using LRU cache', async () => {
    fs.writeFileSync(path.join(skillsDir, 'cached.md'), '---\nname: CachedSkill\ndescription: Cache test\n---\nContent');
    const firstCall = await loadSkills(testDir);
    assert.strictEqual(firstCall.length, 1);
    const statsAfterFirst = getSkillCacheStats();
    assert.strictEqual(statsAfterFirst.misses, 1);
    assert.strictEqual(statsAfterFirst.hits, 0);

    const secondCall = await loadSkills(testDir);
    assert.strictEqual(secondCall.length, 1);
    const statsAfterSecond = getSkillCacheStats();
    assert.strictEqual(statsAfterSecond.misses, 1);
    assert.strictEqual(statsAfterSecond.hits, 1);
  });

  await t.test('detects file updates on disk via mtime and invalidates cache entry', async () => {
    const filePath = path.join(skillsDir, 'dynamic.md');
    fs.writeFileSync(filePath, '---\nname: OriginalName\ndescription: Original description\n---\nBody 1');
    const firstCall = await loadSkills(testDir);
    assert.strictEqual(firstCall[0].name, 'OriginalName');

    // Simulate disk update with modified timestamp
    await new Promise((resolve) => setTimeout(resolve, 50));
    fs.writeFileSync(filePath, '---\nname: UpdatedName\ndescription: Updated description\n---\nBody 2');
    const secondCall = await loadSkills(testDir);
    assert.strictEqual(secondCall[0].name, 'UpdatedName');
    assert.strictEqual(secondCall[0].description, 'Updated description');
  });

  await t.test('SkillLRUCache evicts least recently accessed entries when exceeding capacity', () => {
    const lru = new SkillLRUCache(2);
    lru.set('/file1.md', 100, { filename: 'file1.md', name: 'Skill 1', description: 'Desc 1', trigger: 'CONDITIONAL', content: '1' });
    lru.set('/file2.md', 100, { filename: 'file2.md', name: 'Skill 2', description: 'Desc 2', trigger: 'CONDITIONAL', content: '2' });

    // Access file1 to make it most recently used
    const file1 = lru.get('/file1.md', 100);
    assert.ok(file1);

    // Insert file3 -> should evict file2
    lru.set('/file3.md', 100, { filename: 'file3.md', name: 'Skill 3', description: 'Desc 3', trigger: 'CONDITIONAL', content: '3' });

    assert.strictEqual(lru.get('/file1.md', 100)?.name, 'Skill 1');
    assert.strictEqual(lru.get('/file3.md', 100)?.name, 'Skill 3');
    assert.strictEqual(lru.get('/file2.md', 100), undefined); // Evicted
  });

  await t.test('parseSkillFrontmatter recovers gracefully from malformed YAML and unclosed brackets', () => {
    const malformed = '---\nname: [unclosed array\ndescription: Test\n---\n# Content';
    const result = parseSkillFrontmatter(malformed, 'malformed.md');
    assert.strictEqual(result.success, false);
    assert.ok(result.warning?.includes('YAML syntax parse error'));
    assert.strictEqual(result.skill, undefined);
  });

  await t.test('parseSkillFrontmatter handles non-object frontmatter and empty content', () => {
    const nonObject = '---\n- item1\n- item2\n---\n# Content';
    const result = parseSkillFrontmatter(nonObject, 'list.md');
    assert.strictEqual(result.success, false);
    assert.ok(result.warning?.includes('key-value object'));

    const empty = parseSkillFrontmatter('', 'empty.md');
    assert.strictEqual(empty.success, false);
  });

  await t.test('recovers from malformed files in directory and loads remaining valid skills cleanly', async () => {
    fs.writeFileSync(path.join(skillsDir, 'broken.md'), '---\nname: [invalid\n---\nBroken');
    fs.writeFileSync(path.join(skillsDir, 'good.md'), '---\nname: ValidSkill\ndescription: Operates well\n---\nWorks');
    const skills = await loadSkills(testDir);
    assert.strictEqual(skills.length, 1);
    assert.strictEqual(skills[0].name, 'ValidSkill');
  });
});

