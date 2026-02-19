import assert from 'assert';
import path from 'path';

import mm from '@eggjs/mock';
// @ts-expect-error egg-tracer is not typed
import Tracer from 'egg-tracer/lib/tracer';

describe('plugin/langchain/test/llm.test.ts', () => {
  // https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain/package.json#L9
  if (parseInt(process.version.slice(1, 3)) > 19) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { startSSEServer, stopSSEServer } = require('./fixtures/sse-mcp-server/http');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ChatOpenAIModel } = require('../lib/ChatOpenAI');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { BaseChatOpenAI } = require('@langchain/openai');
    let app: any;

    before(async () => {
      await startSSEServer(17283);
    });

    after(async () => {
      await app.close();
      await stopSSEServer();
    });

    afterEach(() => {
      mm.restore();
    });

    before(async () => {
      mm(process.env, 'EGG_TYPESCRIPT', true);
      mm(process, 'cwd', () => {
        return path.join(__dirname, '..');
      });
      app = mm.app({
        baseDir: path.join(__dirname, 'fixtures/apps/langchain'),
        framework: path.dirname(require.resolve('egg')),
      });
      await app.ready();
    });

    after(() => {
      return app.close();
    });

    it('should work', async () => {
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
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LangGraphTracer } = require('../lib/tracing/LangGraphTracer');

      const persistRunCalls: any[] = [];
      const originalPersistRun = LangGraphTracer.prototype.persistRun;
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
  }
});
