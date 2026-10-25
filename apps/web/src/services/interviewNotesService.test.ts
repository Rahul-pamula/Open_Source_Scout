import assert from 'node:assert/strict';
import { after, afterEach, describe, it } from 'node:test';
import { fetchInterviewNotes, persistInterviewNotes } from './interviewNotesService';

type FetchHandler = typeof fetch;

let activeFetch: FetchHandler | undefined;
const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) =>
        key === 'OSS_SUPABASE_URL'
          ? 'https://example.supabase.co'
          : key === 'OSS_SUPABASE_ANON_KEY'
            ? 'test-anon-key'
            : null,
    },
  },
});

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (!activeFetch) throw new Error('No fetch handler configured for this test.');
  return activeFetch(input, init);
}) as typeof fetch;

afterEach(() => {
  activeFetch = undefined;
});

describe('interviewNotesService', { concurrency: false }, () => {
  describe('persistInterviewNotes', () => {
    it('serializes a normalized notes URL in the tracking request', async () => {
      let requestUrl = '';
      let requestBody: unknown;
      activeFetch = async (input, init) => {
        requestUrl = String(input);
        requestBody = JSON.parse(String(init?.body));
        return Response.json({ updated: true });
      };

      const result = await persistInterviewNotes(
        'task-123',
        '  docs.google.com/document/d/abc123/edit  ',
      );

      assert.deepEqual(result, {
        success: true,
        normalizedUrl: 'https://docs.google.com/document/d/abc123/edit',
        data: { updated: true },
      });
      assert.equal(requestUrl, 'https://example.supabase.co/functions/v1/tracking');
      assert.deepEqual(requestBody, {
        action: 'update_notes_url',
        id: 'task-123',
        interview_notes_url: 'https://docs.google.com/document/d/abc123/edit',
      });
    });

    it('persists an empty URL to clear existing notes', async () => {
      let requestBody: unknown;
      activeFetch = async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return Response.json({ updated: true });
      };

      const result = await persistInterviewNotes('task-123', '   ');

      assert.equal(result.success, true);
      assert.equal(result.normalizedUrl, '');
      assert.deepEqual(requestBody, {
        action: 'update_notes_url',
        id: 'task-123',
        interview_notes_url: '',
      });
    });

    it('rejects missing task IDs and invalid URLs without making a request', async () => {
      let requestCount = 0;
      activeFetch = async () => {
        requestCount += 1;
        return Response.json({});
      };

      assert.deepEqual(await persistInterviewNotes('', 'https://example.com/notes'), {
        success: false,
        normalizedUrl: '',
        error: 'Missing taskId.',
      });
      assert.deepEqual(await persistInterviewNotes('task-123', 'javascript:alert(1)'), {
        success: false,
        normalizedUrl: '',
        error: 'Please enter a valid HTTP or HTTPS document URL.',
      });
      assert.equal(requestCount, 0);
    });

    it('returns the Supabase error message when the request fails', async () => {
      activeFetch = async () =>
        Response.json({ message: 'Task update rejected.' }, { status: 400 });

      const result = await persistInterviewNotes('task-123', 'https://example.com/notes');

      assert.equal(result.success, false);
      assert.equal(result.normalizedUrl, 'https://example.com/notes');
      assert.match(result.error ?? '', /non-2xx status code/);
    });

    it('handles thrown network errors', async () => {
      activeFetch = async () => {
        throw new Error('Connection lost.');
      };

      const result = await persistInterviewNotes('task-123', 'https://example.com/notes');

      assert.deepEqual(result, {
        success: false,
        normalizedUrl: 'https://example.com/notes',
        error: 'Failed to send a request to the Edge Function',
      });
    });
  });

  describe('fetchInterviewNotes', () => {
    it('serializes the task lookup and returns the stored notes URL', async () => {
      let requestUrl = '';
      let requestMethod = '';
      activeFetch = async (input, init) => {
        requestUrl = String(input);
        requestMethod = init?.method ?? 'GET';
        return Response.json({ interview_notes_url: 'https://example.com/interview-notes' });
      };

      const result = await fetchInterviewNotes('task 123');

      assert.equal(result, 'https://example.com/interview-notes');
      assert.match(requestUrl, /\/rest\/v1\/tasks\?/);
      assert.match(requestUrl, /id=eq\.task\+123/);
      assert.match(requestUrl, /select=interview_notes_url/);
      assert.equal(requestMethod, 'GET');
    });

    it('returns null for a missing task ID, empty result, and query error', async () => {
      let requestCount = 0;
      activeFetch = async () => {
        requestCount += 1;
        return new Response(null, { status: 204 });
      };

      assert.equal(await fetchInterviewNotes(''), null);
      assert.equal(await fetchInterviewNotes('task-123'), null);
      assert.equal(requestCount, 1);

      activeFetch = async () => Response.json({ message: 'Query failed.' }, { status: 400 });
      assert.equal(await fetchInterviewNotes('task-123'), null);
    });

    it('returns null when the query throws a network error', async () => {
      activeFetch = async () => {
        throw new Error('Connection lost.');
      };

      assert.equal(await fetchInterviewNotes('task-123'), null);
    });
  });
});

after(() => {
  globalThis.fetch = originalFetch;
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});
