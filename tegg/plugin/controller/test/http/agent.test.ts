import { strict as assert } from 'node:assert';
import { rm } from 'node:fs/promises';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/agent.test.ts', () => {
  let app: MockApplication;
  const agentDataDir = path.join(getFixtures('apps/agent-controller-app'), '.agent-data');

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    mm(process.env, 'TEGG_AGENT_DATA_DIR', agentDataDir);
    app = mm.app({
      baseDir: getFixtures('apps/agent-controller-app'),
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
    it('should create a new thread', async () => {
      const res = await app.httpRequest().post('/api/v1/threads').send({}).expect(200);
      assert(res.body.id);
      assert(typeof res.body.id === 'string');
      assert.equal(res.body.object, 'thread');
      assert(typeof res.body.created_at === 'number');
      assert(typeof res.body.metadata === 'object');
    });
  });

  describe('GET /api/v1/threads/:id (getThread)', () => {
    it('should get a thread by id', async () => {
      // First create a thread
      const createRes = await app.httpRequest().post('/api/v1/threads').send({}).expect(200);
      const threadId = createRes.body.id;

      // Then get the thread
      const res = await app.httpRequest().get(`/api/v1/threads/${threadId}`).expect(200);
      assert.equal(res.body.id, threadId);
      assert.equal(res.body.object, 'thread');
      assert(Array.isArray(res.body.messages));
      assert(typeof res.body.created_at === 'number');
    });

    it('should return 404 for non-existent thread', async () => {
      await app.httpRequest().get('/api/v1/threads/non_existent').expect(404);
    });
  });

  describe('POST /api/v1/runs (asyncRun)', () => {
    it('should create an async run', async () => {
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
    });

    it('should create an async run with thread_id', async () => {
      const createRes = await app.httpRequest().post('/api/v1/threads').send({}).expect(200);

      const res = await app
        .httpRequest()
        .post('/api/v1/runs')
        .send({
          thread_id: createRes.body.id,
          input: {
            messages: [{ role: 'user', content: 'Hello from thread' }],
          },
        })
        .expect(200);
      assert(res.body.id);
      assert.equal(res.body.object, 'thread.run');
      assert.equal(res.body.status, 'queued');
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

      // Verify SSE events in OpenAI format
      assert(events.length >= 6); // at least: run.created, run.in_progress, msg.created, msg.delta, msg.completed, run.completed, done

      assert.equal(events[0].event, 'thread.run.created');
      assert(events[0].data.id);
      assert.equal(events[0].data.object, 'thread.run');
      assert.equal(events[0].data.status, 'queued');

      assert.equal(events[1].event, 'thread.run.in_progress');
      assert.equal(events[1].data.status, 'in_progress');

      assert.equal(events[2].event, 'thread.message.created');
      assert.equal(events[2].data.object, 'thread.message');
      assert.equal(events[2].data.status, 'in_progress');

      assert.equal(events[3].event, 'thread.message.delta');
      assert.equal(events[3].data.object, 'thread.message.delta');
      assert(events[3].data.delta.content[0].text.value.includes('Streamed'));

      assert.equal(events[4].event, 'thread.message.completed');
      assert.equal(events[4].data.status, 'completed');

      assert.equal(events[5].event, 'thread.run.completed');
      assert.equal(events[5].data.status, 'completed');
      assert(events[5].data.output[0].content[0].text.value.includes('Streamed'));
    });

    it('should stream SSE events with multiple messages', async () => {
      const res = await app
        .httpRequest()
        .post('/api/v1/runs/stream')
        .send({
          input: {
            messages: [
              { role: 'system', content: 'You are helpful' },
              { role: 'user', content: 'Hello' },
              { role: 'user', content: 'How are you?' },
            ],
          },
        })
        .buffer(true)
        .expect(200);

      // Verify message count is reflected in the streamed content
      assert(res.text.includes('Streamed 3 messages'));
    });
  });

  describe('POST /api/v1/runs/wait (syncRun)', () => {
    it('should create a sync run and wait for completion', async () => {
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
      assert(Array.isArray(res.body.output));
      assert.equal(res.body.output.length, 1);
      assert.equal(res.body.output[0].object, 'thread.message');
      assert.equal(res.body.output[0].role, 'assistant');
      assert.equal(res.body.output[0].content[0].text.value, 'Processed 1 messages');
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
              { role: 'assistant', content: 'Hi there!' },
              { role: 'user', content: 'How are you?' },
            ],
          },
        })
        .expect(200);
      assert.equal(res.body.status, 'completed');
      assert.equal(res.body.output[0].content[0].text.value, 'Processed 4 messages');
    });
  });

  describe('GET /api/v1/runs/:id (getRun)', () => {
    it('should get a run by id', async () => {
      // First create a run
      const createRes = await app
        .httpRequest()
        .post('/api/v1/runs')
        .send({
          input: {
            messages: [{ role: 'user', content: 'test' }],
          },
        })
        .expect(200);
      const runId = createRes.body.id;

      // Then get the run
      const res = await app.httpRequest().get(`/api/v1/runs/${runId}`).expect(200);
      assert.equal(res.body.id, runId);
      assert.equal(res.body.object, 'thread.run');
      assert.equal(res.body.status, 'queued');
      assert(typeof res.body.created_at === 'number');
    });

    it('should return 404 for non-existent run', async () => {
      await app.httpRequest().get('/api/v1/runs/non_existent').expect(404);
    });
  });

  describe('POST /api/v1/runs/:id/cancel (cancelRun)', () => {
    it('should cancel a run', async () => {
      // First create a run
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

      // Cancel it
      const res = await app.httpRequest().post(`/api/v1/runs/${runId}/cancel`).expect(200);
      assert.equal(res.body.id, runId);
      assert.equal(res.body.object, 'thread.run');
      assert.equal(res.body.status, 'cancelled');

      // Verify status changed
      const getRes = await app.httpRequest().get(`/api/v1/runs/${runId}`).expect(200);
      assert.equal(getRes.body.status, 'cancelled');
    });
  });

  describe('full workflow', () => {
    it('should support create thread → sync run → get run flow', async () => {
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
    });

    it('should support async run → get run → cancel flow', async () => {
      // 1. Create async run
      const asyncRes = await app
        .httpRequest()
        .post('/api/v1/runs')
        .send({
          input: {
            messages: [{ role: 'user', content: 'async task' }],
          },
        })
        .expect(200);
      assert.equal(asyncRes.body.status, 'queued');
      const runId = asyncRes.body.id;

      // 2. Get run - should be queued
      const getRes = await app.httpRequest().get(`/api/v1/runs/${runId}`).expect(200);
      assert.equal(getRes.body.status, 'queued');

      // 3. Cancel run
      const cancelRes = await app.httpRequest().post(`/api/v1/runs/${runId}/cancel`).expect(200);
      assert.equal(cancelRes.body.status, 'cancelled');

      // 4. Verify cancelled
      const verifyRes = await app.httpRequest().get(`/api/v1/runs/${runId}`).expect(200);
      assert.equal(verifyRes.body.status, 'cancelled');
    });
  });
});
