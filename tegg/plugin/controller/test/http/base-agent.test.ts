import { strict as assert } from 'node:assert';
import { rm } from 'node:fs/promises';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/base-agent.test.ts', () => {
  let app: MockApplication;
  const agentDataDir = path.join(getFixtures('apps/base-agent-controller-app'), '.agent-data');

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    mm(process.env, 'TEGG_AGENT_DATA_DIR', agentDataDir);
    app = mm.app({
      baseDir: getFixtures('apps/base-agent-controller-app'),
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await rm(agentDataDir, { recursive: true, force: true }).catch(() => {
      /* ignore */
    });
  });

  describe('POST /api/v1/threads (createThread)', () => {
    it('should create a new thread via smart default', async () => {
      const res = await app.httpRequest().post('/api/v1/threads').send({}).expect(200);
      assert(res.body.id);
      assert(res.body.id.startsWith('thread_'));
      assert.equal(res.body.object, 'thread');
      assert(typeof res.body.created_at === 'number');
      // Unix seconds
      assert(res.body.created_at < Date.now());
      assert(typeof res.body.metadata === 'object');
    });
  });

  describe('GET /api/v1/threads/:id (getThread)', () => {
    it('should get a thread by id', async () => {
      const createRes = await app.httpRequest().post('/api/v1/threads').send({}).expect(200);
      const threadId = createRes.body.id;

      const res = await app.httpRequest().get(`/api/v1/threads/${threadId}`).expect(200);
      assert.equal(res.body.id, threadId);
      assert.equal(res.body.object, 'thread');
      assert(Array.isArray(res.body.messages));
      assert(typeof res.body.created_at === 'number');
    });

    it('should return 500 for non-existent thread', async () => {
      await app.httpRequest().get('/api/v1/threads/non_existent').expect(500);
    });
  });

  describe('POST /api/v1/runs/wait (syncRun)', () => {
    it('should process via execRun and return completed RunObject', async () => {
      const res = await app
        .httpRequest()
        .post('/api/v1/runs/wait')
        .send({
          input: {
            messages: [{ role: 'user', content: 'What is 2+2?' }],
          },
        })
        .expect(200);
      assert(res.body.id);
      assert.equal(res.body.object, 'thread.run');
      assert.equal(res.body.status, 'completed');
      assert(res.body.thread_id);
      assert(res.body.thread_id.startsWith('thread_'));
      assert(Array.isArray(res.body.output));
      assert.equal(res.body.output.length, 1);
      assert.equal(res.body.output[0].object, 'thread.message');
      assert.equal(res.body.output[0].role, 'assistant');
      assert.equal(res.body.output[0].status, 'completed');
      assert.equal(res.body.output[0].content[0].type, 'text');
      assert.equal(res.body.output[0].content[0].text.value, 'Processed 1 messages');
      assert(Array.isArray(res.body.output[0].content[0].text.annotations));
    });

    it('should handle multiple messages', async () => {
      const res = await app
        .httpRequest()
        .post('/api/v1/runs/wait')
        .send({
          input: {
            messages: [
              { role: 'system', content: 'You are helpful' },
              { role: 'user', content: 'Hello' },
              { role: 'user', content: 'How are you?' },
            ],
          },
        })
        .expect(200);
      assert.equal(res.body.status, 'completed');
      assert.equal(res.body.output[0].content[0].text.value, 'Processed 3 messages');
    });

    it('should pass metadata through syncRun and persist to store', async () => {
      const meta = { user_id: 'u_sync', env: 'test' };
      const res = await app
        .httpRequest()
        .post('/api/v1/runs/wait')
        .send({
          input: {
            messages: [{ role: 'user', content: 'Hello' }],
          },
          metadata: meta,
        })
        .expect(200);
      assert.deepEqual(res.body.metadata, meta);

      // Verify persisted via getRun
      const getRes = await app.httpRequest().get(`/api/v1/runs/${res.body.id}`).expect(200);
      assert.deepEqual(getRes.body.metadata, meta);
    });

    it('should auto-create thread and persist messages when thread_id not provided', async () => {
      const runRes = await app
        .httpRequest()
        .post('/api/v1/runs/wait')
        .send({
          input: {
            messages: [{ role: 'user', content: 'Hello agent' }],
          },
        })
        .expect(200);
      assert(runRes.body.thread_id);
      assert(runRes.body.thread_id.startsWith('thread_'));

      // Verify thread was created and messages were appended
      const threadRes = await app.httpRequest().get(`/api/v1/threads/${runRes.body.thread_id}`).expect(200);
      assert.equal(threadRes.body.messages.length, 2); // user + assistant
      assert.equal(threadRes.body.messages[0].role, 'user');
      assert.equal(threadRes.body.messages[1].role, 'assistant');
    });
  });

  describe('POST /api/v1/runs (asyncRun)', () => {
    it('should create an async run and return queued with auto-created thread_id', async () => {
      const res = await app
        .httpRequest()
        .post('/api/v1/runs')
        .send({
          input: {
            messages: [{ role: 'user', content: 'Hello' }],
          },
        })
        .expect(200);
      assert(res.body.id);
      assert.equal(res.body.object, 'thread.run');
      assert.equal(res.body.status, 'queued');
      assert(res.body.thread_id);
      assert(res.body.thread_id.startsWith('thread_'));
    });

    it('should pass metadata through asyncRun and persist to store', async () => {
      const meta = { user_id: 'u_async' };
      const res = await app
        .httpRequest()
        .post('/api/v1/runs')
        .send({
          input: {
            messages: [{ role: 'user', content: 'Hello' }],
          },
          metadata: meta,
        })
        .expect(200);
      assert.deepEqual(res.body.metadata, meta);

      // Wait for background task
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify persisted via getRun
      const getRes = await app.httpRequest().get(`/api/v1/runs/${res.body.id}`).expect(200);
      assert.deepEqual(getRes.body.metadata, meta);
    });

    it('should complete the run in the background', async () => {
      const asyncRes = await app
        .httpRequest()
        .post('/api/v1/runs')
        .send({
          input: {
            messages: [{ role: 'user', content: 'Hello' }],
          },
        })
        .expect(200);
      const runId = asyncRes.body.id;

      // Wait a bit for background task
      await new Promise((resolve) => setTimeout(resolve, 500));

      const getRes = await app.httpRequest().get(`/api/v1/runs/${runId}`).expect(200);
      assert.equal(getRes.body.status, 'completed');
      assert.equal(getRes.body.output[0].content[0].text.value, 'Processed 1 messages');
    });
  });

  describe('POST /api/v1/runs/stream (streamRun)', () => {
    it('should stream SSE events with OpenAI format', async () => {
      const res = await app
        .httpRequest()
        .post('/api/v1/runs/stream')
        .send({
          input: {
            messages: [{ role: 'user', content: 'Stream me' }],
          },
        })
        .buffer(true)
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);

      // Parse SSE events from response text
      const events: { event: string; data: any }[] = [];
      const rawEvents = res.text.split('\n\n').filter(Boolean);
      for (const raw of rawEvents) {
        const lines = raw.split('\n');
        let event = '';
        let data = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) event = line.slice(7);
          if (line.startsWith('data: ')) data = line.slice(6);
        }
        if (event && data) {
          try {
            events.push({ event, data: JSON.parse(data) });
          } catch {
            events.push({ event, data });
          }
        }
      }

      // Expected events: thread.run.created, thread.run.in_progress,
      // thread.message.created, thread.message.delta (assistant msg),
      // thread.message.completed, thread.run.completed, done
      assert(events.length >= 7);

      assert.equal(events[0].event, 'thread.run.created');
      assert(events[0].data.id);
      assert.equal(events[0].data.object, 'thread.run');
      assert.equal(events[0].data.status, 'queued');
      assert(events[0].data.thread_id);
      assert(events[0].data.thread_id.startsWith('thread_'));

      assert.equal(events[1].event, 'thread.run.in_progress');
      assert.equal(events[1].data.status, 'in_progress');

      assert.equal(events[2].event, 'thread.message.created');
      assert.equal(events[2].data.object, 'thread.message');
      assert.equal(events[2].data.role, 'assistant');
      assert.equal(events[2].data.status, 'in_progress');
      assert.deepEqual(events[2].data.content, []);

      // thread.message.delta for the assistant message
      assert.equal(events[3].event, 'thread.message.delta');
      assert.equal(events[3].data.object, 'thread.message.delta');
      assert.equal(events[3].data.delta.content[0].text.value, 'Processed 1 messages');

      // No delta for the usage-only yield (type: 'result')

      assert.equal(events[4].event, 'thread.message.completed');
      assert.equal(events[4].data.status, 'completed');
      assert.equal(events[4].data.content[0].text.value, 'Processed 1 messages');

      assert.equal(events[5].event, 'thread.run.completed');
      assert.equal(events[5].data.status, 'completed');
      assert.equal(events[5].data.output[0].role, 'assistant');
      assert.equal(events[5].data.output[0].content[0].text.value, 'Processed 1 messages');
      assert.equal(events[5].data.usage.prompt_tokens, 10);
      assert.equal(events[5].data.usage.completion_tokens, 5);
      assert.equal(events[5].data.usage.total_tokens, 15);

      assert.equal(events[6].event, 'done');
    });

    it('should persist in_progress and started_at to store during stream', async () => {
      const res = await app
        .httpRequest()
        .post('/api/v1/runs/stream')
        .send({
          input: {
            messages: [{ role: 'user', content: 'Stream me' }],
          },
        })
        .buffer(true)
        .expect(200);

      // Extract run id from the first SSE event
      const firstEvent = res.text.split('\n\n')[0];
      const dataLine = firstEvent.split('\n').find((l: string) => l.startsWith('data: '));
      const runData = JSON.parse(dataLine!.slice(6));
      const runId = runData.id;

      // After stream completes, verify run was persisted with started_at
      const getRes = await app.httpRequest().get(`/api/v1/runs/${runId}`).expect(200);
      assert.equal(getRes.body.status, 'completed');
      assert(typeof getRes.body.started_at === 'number');
      assert(getRes.body.started_at > 0);
    });

    it('should include metadata in SSE events and persist to store', async () => {
      const meta = { user_id: 'u_stream', tag: 'test' };
      const res = await app
        .httpRequest()
        .post('/api/v1/runs/stream')
        .send({
          input: {
            messages: [{ role: 'user', content: 'Stream me' }],
          },
          metadata: meta,
        })
        .buffer(true)
        .expect(200);

      // Parse SSE events
      const events: { event: string; data: any }[] = [];
      const rawEvents = res.text.split('\n\n').filter(Boolean);
      for (const raw of rawEvents) {
        const lines = raw.split('\n');
        let event = '';
        let data = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) event = line.slice(7);
          if (line.startsWith('data: ')) data = line.slice(6);
        }
        if (event && data) {
          try {
            events.push({ event, data: JSON.parse(data) });
          } catch {
            events.push({ event, data });
          }
        }
      }

      // Verify metadata in SSE events
      assert.deepEqual(events[0].data.metadata, meta); // thread.run.created
      assert.deepEqual(events[1].data.metadata, meta); // thread.run.in_progress

      // Verify metadata persisted in store via getRun
      const runId = events[0].data.id;
      const getRes = await app.httpRequest().get(`/api/v1/runs/${runId}`).expect(200);
      assert.deepEqual(getRes.body.metadata, meta);
    });
  });

  describe('GET /api/v1/runs/:id (getRun)', () => {
    it('should get a run by id', async () => {
      const createRes = await app
        .httpRequest()
        .post('/api/v1/runs/wait')
        .send({
          input: {
            messages: [{ role: 'user', content: 'test' }],
          },
        })
        .expect(200);
      const runId = createRes.body.id;

      const res = await app.httpRequest().get(`/api/v1/runs/${runId}`).expect(200);
      assert.equal(res.body.id, runId);
      assert.equal(res.body.object, 'thread.run');
      assert.equal(res.body.status, 'completed');
      assert(typeof res.body.created_at === 'number');
    });

    it('should return 500 for non-existent run', async () => {
      await app.httpRequest().get('/api/v1/runs/non_existent').expect(500);
    });
  });

  describe('POST /api/v1/runs/:id/cancel (cancelRun)', () => {
    it('should cancel a run', async () => {
      const createRes = await app
        .httpRequest()
        .post('/api/v1/runs')
        .send({
          input: {
            messages: [{ role: 'user', content: 'cancel me' }],
          },
        })
        .expect(200);
      const runId = createRes.body.id;

      // Wait for background task to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      const res = await app.httpRequest().post(`/api/v1/runs/${runId}/cancel`).expect(200);
      assert.equal(res.body.id, runId);
      assert.equal(res.body.object, 'thread.run');
      assert.equal(res.body.status, 'cancelled');

      // Verify status
      const getRes = await app.httpRequest().get(`/api/v1/runs/${runId}`).expect(200);
      assert.equal(getRes.body.status, 'cancelled');
    });
  });

  describe('full workflow', () => {
    it('should support create thread → sync run → get thread with messages', async () => {
      // 1. Create thread
      const threadRes = await app.httpRequest().post('/api/v1/threads').send({}).expect(200);
      const threadId = threadRes.body.id;

      // 2. Run sync with thread
      const runRes = await app
        .httpRequest()
        .post('/api/v1/runs/wait')
        .send({
          thread_id: threadId,
          input: {
            messages: [{ role: 'user', content: 'Hello agent' }],
          },
        })
        .expect(200);
      assert.equal(runRes.body.status, 'completed');
      const runId = runRes.body.id;

      // 3. Get run details
      const getRunRes = await app.httpRequest().get(`/api/v1/runs/${runId}`).expect(200);
      assert.equal(getRunRes.body.id, runId);
      assert.equal(getRunRes.body.thread_id, threadId);
      assert.equal(getRunRes.body.status, 'completed');

      // 4. Thread should have messages appended
      const getThreadRes = await app.httpRequest().get(`/api/v1/threads/${threadId}`).expect(200);
      assert.equal(getThreadRes.body.messages.length, 2);
      assert.equal(getThreadRes.body.messages[0].role, 'user');
      assert.equal(getThreadRes.body.messages[1].role, 'assistant');
    });
  });
});
