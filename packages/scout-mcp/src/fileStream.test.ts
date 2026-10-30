import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { streamReadFile } from './fileStream.js';

describe('Chunked Stream File Reader Suite', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-stream-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('1. reads small file completely with accurate totalBytes', async () => {
    const filePath = path.join(tempDir, 'small.txt');
    const content = 'Hello Scout MCP Streaming!';
    await fs.writeFile(filePath, content, 'utf8');

    const result = await streamReadFile(filePath);
    assert.equal(result.content, content);
    assert.equal(result.bytesRead, Buffer.byteLength(content, 'utf8'));
    assert.equal(result.totalBytes, Buffer.byteLength(content, 'utf8'));
    assert.equal(result.truncated, false);
    assert.equal(result.offset, 0);
  });

  it('2. reads chunks using offset and limit parameters', async () => {
    const filePath = path.join(tempDir, 'chunked.txt');
    const content = '0123456789abcdefghijklmnopqrstuvwxyz';
    await fs.writeFile(filePath, content, 'utf8');

    // Read middle chunk of 10 bytes starting at byte 10 ('abcdefghij')
    const result = await streamReadFile(filePath, { offset: 10, limit: 10 });
    assert.equal(result.content, 'abcdefghij');
    assert.equal(result.bytesRead, 10);
    assert.equal(result.totalBytes, 36);
    assert.equal(result.offset, 10);
  });

  it('3. handles multi-byte UTF-8 sequences across chunk boundaries cleanly', async () => {
    const filePath = path.join(tempDir, 'unicode.txt');
    // Multi-byte characters: emoji (4 bytes), cyrillic (2 bytes), cjk (3 bytes)
    const content = '🚀 Scóut Привет 世界 🌟'.repeat(100);
    await fs.writeFile(filePath, content, 'utf8');

    // Use small highWaterMark (e.g. 17 bytes) to force splits across multi-byte boundaries
    const result = await streamReadFile(filePath, { highWaterMark: 17 });
    assert.equal(result.content, content);
    assert.equal(result.bytesRead, Buffer.byteLength(content, 'utf8'));
  });

  it('4. returns empty content when offset is past EOF or file is empty', async () => {
    const emptyFile = path.join(tempDir, 'empty.txt');
    await fs.writeFile(emptyFile, '', 'utf8');

    const rEmpty = await streamReadFile(emptyFile);
    assert.equal(rEmpty.content, '');
    assert.equal(rEmpty.bytesRead, 0);
    assert.equal(rEmpty.totalBytes, 0);

    const normalFile = path.join(tempDir, 'normal.txt');
    await fs.writeFile(normalFile, 'Some content', 'utf8');
    const rPastEof = await streamReadFile(normalFile, { offset: 9999 });
    assert.equal(rPastEof.content, '');
    assert.equal(rPastEof.bytesRead, 0);
  });
});
