import test from 'node:test';
import assert from 'node:assert';
import { CommandBoundaryGuard } from './guardrails.js';

test('CommandBoundaryGuard', async (t) => {
  await t.test('legitimate commands allowed', () => {
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('ls -la'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('echo hello'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('cd src'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('cd src/components'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('cd ./src'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('cd src && npm run build'));
    assert.doesNotThrow(() => CommandBoundaryGuard.validate('cd foo; ls'));
  });

  await t.test('escape patterns blocked', () => {
    assert.throws(() => CommandBoundaryGuard.validate('cd ..'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('cd ../..'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('cd src/..'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('pushd ..'), /Directory escape detected/);
    
    assert.throws(() => CommandBoundaryGuard.validate('cd /etc'), /Absolute directory traversal detected/);
    assert.throws(() => CommandBoundaryGuard.validate('cd /var/log'), /Absolute directory traversal detected/);
    
    assert.throws(() => CommandBoundaryGuard.validate('cd ~'), /Home directory traversal detected/);
    assert.throws(() => CommandBoundaryGuard.validate('cd ~/foo'), /Home directory traversal detected/);
    
    assert.throws(() => CommandBoundaryGuard.validate('ls && cd ..'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('cd src; cd ../..'), /Directory escape detected/);
    assert.throws(() => CommandBoundaryGuard.validate('echo hello || cd /'), /Absolute directory traversal detected/);
  });
});
