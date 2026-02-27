import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, it, beforeEach, afterEach } from 'vitest';

import { enhanceAgentController } from '../src/enhanceAgentController.ts';

const NOT_IMPLEMENTED = Symbol.for('AGENT_NOT_IMPLEMENTED');

// Helper: create a stub function like the @AgentController decorator does
function createStub(hasParam: boolean) {
  let fn;
  if (hasParam) {
    fn = async function (_arg: unknown) {
      throw new Error('not implemented');
    };
  } else {
    fn = async function () {
      throw new Error('not implemented');
    };
  }
  (fn as any)[NOT_IMPLEMENTED] = true;
  return fn;
}

describe('core/agent-runtime/test/enhanceAgentController.test.ts', () => {
  const dataDir = path.join(import.meta.dirname, '.enhance-test-data');

  beforeEach(() => {
    process.env.TEGG_AGENT_DATA_DIR = dataDir;
  });

  afterEach(async () => {
    delete process.env.TEGG_AGENT_DATA_DIR;
    await fs.rm(dataDir, { recursive: true, force: true }).catch(() => {
      /* ignore */
    });
  });

  it('should skip classes without AGENT_CONTROLLER symbol', () => {
    class NoMarker {
      async *execRun() {
        yield {
          type: 'assistant',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'hello' }] },
        };
      }
    }
    (NoMarker.prototype as any)['syncRun'] = createStub(true);
    // Should not throw — class has execRun but no Symbol marker
    enhanceAgentController(NoMarker as any);
    // syncRun should remain unchanged (still the stub)
    assert((NoMarker.prototype as any).syncRun[NOT_IMPLEMENTED]);
  });

  it('should replace stub methods with smart defaults', async () => {
    class MyAgent {
      async *execRun() {
        yield {
          type: 'assistant',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'hello' }] },
        };
      }
    }
    (MyAgent as any)[Symbol.for('AGENT_CONTROLLER')] = true;
    // Simulate stubs set by @AgentController
    (MyAgent.prototype as any)['createThread'] = createStub(false);
    (MyAgent.prototype as any)['getThread'] = createStub(true);
    (MyAgent.prototype as any)['syncRun'] = createStub(true);
    (MyAgent.prototype as any)['asyncRun'] = createStub(true);
    (MyAgent.prototype as any)['streamRun'] = createStub(true);
    (MyAgent.prototype as any)['getRun'] = createStub(true);
    (MyAgent.prototype as any)['cancelRun'] = createStub(true);

    enhanceAgentController(MyAgent as any);

    // Stubs should be replaced — no longer marked
    assert(!(MyAgent.prototype as any).createThread[NOT_IMPLEMENTED]);
    assert(!(MyAgent.prototype as any).syncRun[NOT_IMPLEMENTED]);

    // init/destroy should be wrapped
    assert(typeof (MyAgent.prototype as any).init === 'function');
    assert(typeof (MyAgent.prototype as any).destroy === 'function');

    // Actually call init to verify store is created
    const instance = new MyAgent() as any;
    await instance.init();
    assert(instance.__agentStore);
    assert(instance.__runningTasks instanceof Map);

    // createThread should work and return OpenAI format
    const thread = await instance.createThread();
    assert(thread.id.startsWith('thread_'));
    assert.equal(thread.object, 'thread');

    await instance.destroy();
  });

  it('should preserve user-defined methods (not stubs)', async () => {
    const customResult = { id: 'custom', object: 'thread.run', created_at: 1, status: 'completed', output: [] };

    class MyAgent {
      async *execRun() {
        yield {
          type: 'assistant',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'hello' }] },
        };
      }

      // User-defined syncRun — no NOT_IMPLEMENTED marker
      async syncRun() {
        return customResult;
      }
    }
    (MyAgent as any)[Symbol.for('AGENT_CONTROLLER')] = true;
    // All other methods are stubs
    (MyAgent.prototype as any)['createThread'] = createStub(false);
    (MyAgent.prototype as any)['getThread'] = createStub(true);
    (MyAgent.prototype as any)['asyncRun'] = createStub(true);
    (MyAgent.prototype as any)['streamRun'] = createStub(true);
    (MyAgent.prototype as any)['getRun'] = createStub(true);
    (MyAgent.prototype as any)['cancelRun'] = createStub(true);

    enhanceAgentController(MyAgent as any);

    // User syncRun should be preserved
    const instance = new MyAgent() as any;
    await instance.init();
    const result = await instance.syncRun();
    assert.deepEqual(result, customResult);

    // Stubs should be replaced
    assert(!(instance as any).createThread[NOT_IMPLEMENTED]);

    await instance.destroy();
  });

  it('should wrap init() and call original init', async () => {
    let originalInitCalled = false;

    class MyAgent {
      async *execRun() {
        yield {
          type: 'assistant',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'hello' }] },
        };
      }

      async init() {
        originalInitCalled = true;
      }
    }
    (MyAgent as any)[Symbol.for('AGENT_CONTROLLER')] = true;
    (MyAgent.prototype as any)['syncRun'] = createStub(true);

    enhanceAgentController(MyAgent as any);

    const instance = new MyAgent() as any;
    await instance.init();
    assert(originalInitCalled);
    assert(instance.__agentStore);

    await instance.destroy();
  });

  it('should wrap destroy() and call original destroy', async () => {
    let originalDestroyCalled = false;

    class MyAgent {
      async *execRun() {
        yield {
          type: 'assistant',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'hello' }] },
        };
      }

      async destroy() {
        originalDestroyCalled = true;
      }
    }
    (MyAgent as any)[Symbol.for('AGENT_CONTROLLER')] = true;
    (MyAgent.prototype as any)['syncRun'] = createStub(true);

    enhanceAgentController(MyAgent as any);

    const instance = new MyAgent() as any;
    await instance.init();
    await instance.destroy();
    assert(originalDestroyCalled);
  });

  it('should support custom store via createStore()', async () => {
    const customStore = {
      createThread: async () => ({
        id: 'custom_t',
        object: 'thread' as const,
        messages: [],
        metadata: {},
        created_at: 1,
      }),
      getThread: async () => ({ id: 'custom_t', object: 'thread' as const, messages: [], metadata: {}, created_at: 1 }),
      appendMessages: async () => {
        /* noop */
      },
      createRun: async () => ({
        id: 'custom_r',
        object: 'thread.run' as const,
        status: 'queued' as const,
        input: [],
        created_at: 1,
      }),
      getRun: async () => ({
        id: 'custom_r',
        object: 'thread.run' as const,
        status: 'queued' as const,
        input: [],
        created_at: 1,
      }),
      updateRun: async () => {
        /* noop */
      },
    };

    class MyAgent {
      async createStore() {
        return customStore;
      }

      async *execRun() {
        yield {
          type: 'assistant',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'hello' }] },
        };
      }
    }
    (MyAgent as any)[Symbol.for('AGENT_CONTROLLER')] = true;
    (MyAgent.prototype as any)['syncRun'] = createStub(true);

    enhanceAgentController(MyAgent as any);

    const instance = new MyAgent() as any;
    await instance.init();
    assert.strictEqual(instance.__agentStore, customStore);

    await instance.destroy();
  });

  it('should treat missing methods the same as stubs', async () => {
    class MyAgent {
      async *execRun() {
        yield {
          type: 'assistant',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'hello' }] },
        };
      }
      // No methods defined at all — no stubs either
    }
    (MyAgent as any)[Symbol.for('AGENT_CONTROLLER')] = true;

    enhanceAgentController(MyAgent as any);

    const instance = new MyAgent() as any;
    await instance.init();

    // Default createThread should be injected and return OpenAI format
    const thread = await instance.createThread();
    assert(thread.id.startsWith('thread_'));
    assert.equal(thread.object, 'thread');

    await instance.destroy();
  });
});
