import test from 'node:test';
import assert from 'node:assert';
import { parseTestOutputSummary } from './validation.js';

test('Structured Test Output Summary Parsing Suite', async (t) => {
  await t.test('1. Parses Node.js native test runner and tsx summary outputs', () => {
    const output = [
      '▶ Math Operations',
      '  ✔ adds numbers (1.23ms)',
      '  ✔ subtracts numbers (0.84ms)',
      '  ✖ divides by zero (2.11ms)',
      'ℹ tests 3',
      'ℹ suites 1',
      'ℹ pass 2',
      'ℹ fail 1',
      'ℹ cancelled 0',
      'ℹ skipped 0',
      'ℹ todo 0',
      'ℹ duration_ms 42.15',
    ].join('\n');

    const summary = parseTestOutputSummary(output);
    assert.strictEqual(summary.total, 3);
    assert.strictEqual(summary.passed, 2);
    assert.strictEqual(summary.failed, 1);
    assert.strictEqual(summary.duration_ms, 42);
  });

  await t.test('2. Parses Jest and Vitest summary lines', () => {
    const jestOutput = [
      'PASS src/services/auth.test.ts',
      'FAIL src/services/user.test.ts',
      'Test Suites: 1 failed, 1 passed, 2 total',
      'Tests:       1 failed, 15 passed, 16 total',
      'Snapshots:   0 total',
      'Time:        3.421 s',
      'Ran all test suites.',
    ].join('\n');

    const summary = parseTestOutputSummary(jestOutput);
    assert.strictEqual(summary.total, 16);
    assert.strictEqual(summary.passed, 15);
    assert.strictEqual(summary.failed, 1);
    assert.strictEqual(summary.duration_ms, 3421);
  });

  await t.test('3. Parses Pytest summary lines and duration', () => {
    const pytestOutput = [
      '============================= test session starts ==============================',
      'collected 42 items',
      'tests/test_api.py .......................................... [100%]',
      '======================== 40 passed, 2 failed in 2.85s =========================',
    ].join('\n');

    const summary = parseTestOutputSummary(pytestOutput);
    assert.strictEqual(summary.total, 42);
    assert.strictEqual(summary.passed, 40);
    assert.strictEqual(summary.failed, 2);
    assert.strictEqual(summary.duration_ms, 2850);
  });

  await t.test('4. Parses Cargo test execution summaries', () => {
    const cargoOutput = [
      'running 12 tests',
      'test parser::test_parse ... ok',
      'test lexer::test_tokenize ... ok',
      'test result: ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.12s',
    ].join('\n');

    const summary = parseTestOutputSummary(cargoOutput);
    assert.strictEqual(summary.total, 12);
    assert.strictEqual(summary.passed, 12);
    assert.strictEqual(summary.failed, 0);
    assert.strictEqual(summary.duration_ms, 120);
  });

  await t.test('5. Gracefully handles unformatted or empty logs', () => {
    const emptySummary = parseTestOutputSummary('');
    assert.deepStrictEqual(emptySummary, {
      total: null,
      passed: null,
      failed: null,
      duration_ms: null,
    });

    const arbitraryLog = 'Compilation succeeded with no tests defined.';
    const arbitarySummary = parseTestOutputSummary(arbitraryLog);
    assert.deepStrictEqual(arbitarySummary, {
      total: null,
      passed: null,
      failed: null,
      duration_ms: null,
    });
  });
});
