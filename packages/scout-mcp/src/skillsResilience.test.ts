import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { loadSkills, clearSkillCache, parseSkillFrontmatter, getSkillCacheStats } from './skills.js';

test('Skills YAML Frontmatter Resilience & Error Recovery Suite', async (t) => {
  const testDir = path.join(process.cwd(), '.test-scout-resilience');
  const skillsDir = path.join(testDir, '.scout', 'skills');

  t.beforeEach(() => {
    clearSkillCache();
    fs.mkdirSync(skillsDir, { recursive: true });
  });

  t.afterEach(() => {
    clearSkillCache();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  await t.test('1. Survives unclosed brackets, unquoted colons, and syntax errors without throwing', () => {
    const invalidFixtures = [
      '---\nname: [unclosed array\ndescription: test\n---\nBody',
      '---\nname: test: with: unquoted: colons: everywhere\n---\nBody',
      '---\nname: invalid-escape: "\\uXYZ"\n---\nBody',
      '---\n\tname: tab-indented\n\tdescription: invalid in strict YAML\n---\nBody',
    ];

    for (const [index, fixture] of invalidFixtures.entries()) {
      const result = parseSkillFrontmatter(fixture, `invalid-${index}.md`);
      assert.strictEqual(result.success, false);
      assert.ok(result.warning);
      assert.strictEqual(result.skill, undefined);
    }
  });

  await t.test('2. Safely skips files missing required fields (name, description)', () => {
    const missingName = '---\ndescription: Has description but no name\n---\nBody';
    const missingDesc = '---\nname: HasNameNoDesc\n---\nBody';
    const emptyName = '---\nname: "   "\ndescription: Valid desc\n---\nBody';

    assert.strictEqual(parseSkillFrontmatter(missingName, 'no-name.md').success, false);
    assert.strictEqual(parseSkillFrontmatter(missingDesc, 'no-desc.md').success, false);
    assert.strictEqual(parseSkillFrontmatter(emptyName, 'empty-name.md').success, false);
  });

  await t.test('3. Safely skips non-object frontmatter (lists, scalars, numbers)', () => {
    const listFrontmatter = '---\n- item1\n- item2\n---\nBody';
    const scalarFrontmatter = '---\n42\n---\nBody';
    const stringFrontmatter = '---\n"just a string"\n---\nBody';

    assert.strictEqual(parseSkillFrontmatter(listFrontmatter, 'list.md').success, false);
    assert.strictEqual(parseSkillFrontmatter(scalarFrontmatter, 'scalar.md').success, false);
    assert.strictEqual(parseSkillFrontmatter(stringFrontmatter, 'string.md').success, false);
  });

  await t.test('4. Safely handles empty files and files missing frontmatter delimiters', () => {
    assert.strictEqual(parseSkillFrontmatter('', 'empty.md').success, false);
    assert.strictEqual(parseSkillFrontmatter('   \n  \t  ', 'whitespace.md').success, false);
    assert.strictEqual(parseSkillFrontmatter('# Just a title\nNo delimiters here', 'plain.md').success, false);
  });

  await t.test('5. Loads valid skills cleanly when co-located with corrupted fixtures in same directory', async () => {
    // Write corrupted fixtures
    fs.writeFileSync(path.join(skillsDir, 'corrupt-1.md'), '---\nname: [unclosed\n---\nBroken');
    fs.writeFileSync(path.join(skillsDir, 'corrupt-2.md'), '---\n42\n---\nBroken');
    fs.writeFileSync(path.join(skillsDir, 'corrupt-3.md'), '---\ndescription: missing name\n---\nBroken');
    fs.writeFileSync(path.join(skillsDir, 'corrupt-4.md'), '');

    // Write valid skills
    fs.writeFileSync(
      path.join(skillsDir, 'valid-alpha.md'),
      '---\nname: AlphaSkill\ndescription: Alpha operation guidelines\ntags: [alpha]\n---\nAlpha docs',
    );
    fs.writeFileSync(
      path.join(skillsDir, 'valid-beta.md'),
      '---\nname: BetaSkill\ndescription: Beta operation guidelines\ntags: [beta]\n---\nBeta docs',
    );

    const skills = await loadSkills(undefined, testDir);
    assert.strictEqual(skills.length, 2);
    const names = skills.map((s) => s.name);
    assert.ok(names.includes('AlphaSkill'));
    assert.ok(names.includes('BetaSkill'));
  });

  await t.test('6. Caches unparseable files in LRU cache to prevent repeated re-parsing', async () => {
    fs.writeFileSync(path.join(skillsDir, 'malformed.md'), '---\nname: [broken\n---\nError');
    fs.writeFileSync(path.join(skillsDir, 'good.md'), '---\nname: Good\ndescription: Works\n---\nOK');

    const first = await loadSkills(undefined, testDir);
    assert.strictEqual(first.length, 1);
    const stats1 = getSkillCacheStats();
    assert.strictEqual(stats1.misses, 2); // 2 files initially parsed

    const second = await loadSkills(undefined, testDir);
    assert.strictEqual(second.length, 1);
    const stats2 = getSkillCacheStats();
    assert.strictEqual(stats2.hits, 2); // Both files resolved from LRU cache
  });
});
