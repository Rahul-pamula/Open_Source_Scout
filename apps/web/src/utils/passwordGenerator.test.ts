import { describe, test } from 'node:test';
import assert from 'node:assert';
import { generateSecurePassword, evaluatePasswordStrength } from './passwordGenerator';

/** Closes #827: Password generation and strength test suite */
describe('passwordGenerator & strength evaluation', () => {
  test('generates secure passwords with high entropy and custom length', () => {
    const pass = generateSecurePassword(24);
    assert.strictEqual(pass.length, 24);
    assert.ok(/[A-Z]/.test(pass));
    assert.ok(/[a-z]/.test(pass));
  });

  test('correctly evaluates password strength levels', () => {
    const weak = evaluatePasswordStrength('abc');
    assert.strictEqual(weak.label, 'Very Weak');

    const strong = evaluatePasswordStrength('P@ssw0rd123456789!#');
    assert.strictEqual(strong.score, 4);
    assert.strictEqual(strong.label, 'Very Strong');
  });
});
