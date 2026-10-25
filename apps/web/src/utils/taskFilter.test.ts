import { describe, it } from 'node:test';
import assert from 'node:assert';
import { filterTasksByQuery } from './taskFilter';
import type { Task } from '../types';

describe('taskFilter utility', () => {
  const mockTasks: Task[] = [
    {
      id: 'task-1',
      user_id: 'user-1',
      platform: 'github',
      external_id: '1030',
      external_url: 'https://github.com/TabularisDB/tabularis/issues/1030',
      title: '[Feat]: Data grid: copy all column names (one per line or as a JSON array)',
      repo_name: 'TabularisDB/tabularis',
      state: 'COMPLETED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-2',
      user_id: 'user-1',
      platform: 'github',
      external_id: '6',
      external_url: 'https://github.com/openapi/every-language-fiscal-code/issues/6',
      title: 'Implement Italian Fiscal Code in Kotlin',
      repo_name: 'openapi/every-language-fiscal-code',
      state: 'COMPLETED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-3',
      user_id: 'user-1',
      platform: 'github',
      external_id: '48',
      external_url: 'https://github.com/itzzzzzak/connector-kit/issues/48',
      title: 'Add a Dropbox connector',
      repo_name: 'itzzzzzak/connector-kit',
      state: 'COMPLETED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-4',
      user_id: 'user-1',
      platform: 'github',
      external_id: '187',
      external_url: 'https://github.com/Rahul-pamula/Open_Source_Scout/issues/187',
      title: 'RFC: Scout 2.0 Architecture Pivot — Hybrid Architecture',
      repo_name: 'Rahul-pamula/Open_Source_Scout',
      state: 'COMPLETED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('returns all tasks when query is empty or whitespace', () => {
    assert.strictEqual(filterTasksByQuery(mockTasks, '').length, 4);
    assert.strictEqual(filterTasksByQuery(mockTasks, '   ').length, 4);
  });

  it('filters by repository name case-insensitively', () => {
    const result = filterTasksByQuery(mockTasks, 'tabularis');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 'task-1');

    const result2 = filterTasksByQuery(mockTasks, 'OPENAPI');
    assert.strictEqual(result2.length, 1);
    assert.strictEqual(result2[0].id, 'task-2');

    const result3 = filterTasksByQuery(mockTasks, 'connector-kit');
    assert.strictEqual(result3.length, 1);
    assert.strictEqual(result3[0].id, 'task-3');
  });

  it('filters by issue title', () => {
    const result = filterTasksByQuery(mockTasks, 'Dropbox');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 'task-3');

    const result2 = filterTasksByQuery(mockTasks, 'Kotlin');
    assert.strictEqual(result2.length, 1);
    assert.strictEqual(result2[0].id, 'task-2');
  });

  it('filters by issue number', () => {
    const result = filterTasksByQuery(mockTasks, '#1030');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 'task-1');

    const result2 = filterTasksByQuery(mockTasks, '187');
    assert.strictEqual(result2.length, 1);
    assert.strictEqual(result2[0].id, 'task-4');
  });

  it('returns empty array when no matches exist', () => {
    const result = filterTasksByQuery(mockTasks, 'nonexistent-repo-xyz');
    assert.strictEqual(result.length, 0);
  });
});
