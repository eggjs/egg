import assert from 'assert';
import { createRequire } from 'module';
import path from 'path';

import mm from '@eggjs/mock';
import { Tracer } from '@eggjs/tracer/lib/tracer';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

const require = createRequire(import.meta.url);

describe('plugin/langchain/test/llm.test.ts', () => {
  let startSSEServer: any;
  let stopSSEServer: any;
  let app: any;

  beforeAll(async () => {
    const sseFixturePath = './fixtures/sse-mcp-server/http.ts';
    const sseMod = await import(sseFixturePath);
    startSSEServer = sseMod.startSSEServer;
    stopSSEServer = sseMod.stopSSEServer;

    await startSSEServer(17283);
  });

  afterAll(async () => {
    await app.close();
    await stopSSEServer();
  });

  afterEach(() => {
    mm.restore();
  });

  // app boot exceeds vitest's default 10s hook timeout on slow Windows CI
  // runners (glob projects do not inherit the root config's hookTimeout)
  beforeAll(async () => {
    mm(process.env, 'EGG_TYPESCRIPT', true);
    mm(process, 'cwd', () => {
      return path.join(__dirname, '..');
    });
    app = mm.app({
      baseDir: path.join(__dirname, 'fixtures/apps/langchain'),
      framework: path.dirname(require.resolve('egg/package.json')),
    });
    await app.ready();
  }, 30_000);

  afterAll(() => {
    return app.close();
  });

  it('should work', async () => {
    const { ChatOpenAIModel } = await import('../src/lib/ChatOpenAI.ts');
    mm(ChatOpenAIModel.prototype, 'invoke', async () => {
      return {
        text: 'hello world',
      };
    });
    const res = await app.httpRequest().get('/llm/hello').expect(200);
    assert.deepStrictEqual(res.body, {
      text: 'hello world',
    });
  });

  it('should bound work', async () => {
    const { BaseChatOpenAI } = await import('@langchain/openai');
    mm(BaseChatOpenAI.prototype, 'invoke', async () => {
      return {
        text: 'hello world 2',
      };
    });
    const res = await app.httpRequest().get('/llm/bound-chat').expect(200);
    assert.deepStrictEqual(res.body, {
      text: 'hello world 2',
    });
  });

  it('should graph work', async () => {
    app.mockLog();
    mm(Tracer.prototype, 'traceId', 'test-trace-id');
    await app.httpRequest().get('/llm/graph').expect(200, { value: 'hello graph toolhello world' });
    app.expectLog(/agent_run/);
    app.expectLog(/Executing FooNode thread_id is 1/);
    app.expectLog(/traceId=test-trace-id/);
  });

  it('should persistRun be triggered when graph.invoke is called', async () => {
    const { LangGraphTracer } = await import('../src/lib/tracing/LangGraphTracer.ts');

    const persistRunCalls: any[] = [];
    const originalPersistRun = (LangGraphTracer.prototype as any).persistRun;
    mm(LangGraphTracer.prototype, 'persistRun', function (this: any, run: any) {
      persistRunCalls.push(run);
      return originalPersistRun.call(this, run);
    });

    app.mockLog();
    mm(Tracer.prototype, 'traceId', 'test-persist-run-trace-id');

    await app.httpRequest().get('/llm/graph');

    assert(persistRunCalls.length > 0, 'persistRun should be called at least once');

    const hasCorrectTraceId = persistRunCalls.some((run) => run.trace_id === 'test-persist-run-trace-id');
    assert(hasCorrectTraceId, 'persistRun should receive correct trace_id from invoke call');

    app.expectLog(/agent_run/);
    app.expectLog(/traceId=test-persist-run-trace-id/);
  });

  it('should structured work', async () => {
    const res = await app.httpRequest().get('/llm/structured').expect(200);
    assert.deepStrictEqual(res.body, {
      name: 'search',
      description: 'Call the foo tool',
    });
  });
});
