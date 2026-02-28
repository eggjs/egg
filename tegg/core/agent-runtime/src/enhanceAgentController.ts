import path from 'node:path';

import { AgentInfoUtil } from '@eggjs/controller-decorator';
import type { CreateRunInput } from '@eggjs/controller-decorator';
import { ContextHandler } from '@eggjs/tegg-runtime';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import type { AgentRuntime } from './AgentRuntime.ts';
import { AGENT_RUNTIME, createAgentRuntime } from './AgentRuntime.ts';
import type { AgentStore } from './AgentStore.ts';
import { FileAgentStore } from './FileAgentStore.ts';
import { NodeSSEWriter } from './SSEWriter.ts';

// Canonical definition in @eggjs/module-common (tegg/plugin/common).
// Re-declared here to avoid a core→plugin dependency.
const EGG_CONTEXT: symbol = Symbol.for('context#eggContext');

const AGENT_METHOD_NAMES = ['createThread', 'getThread', 'asyncRun', 'syncRun', 'getRun', 'cancelRun'];

// Enhance an AgentController class with smart default implementations.
//
// Called by the plugin/controller lifecycle hook AFTER the decorator has set
// HTTP metadata and injected stub methods. Detects which methods are
// user-defined vs stubs (via AgentInfoUtil.isNotImplemented() marker)
// and installs AgentRuntime-delegating methods on each instance (not on
// the prototype) during init().
//
// Prerequisites:
// - The class must be marked via AgentInfoUtil.isAgentController() (otherwise this is a no-op).
// - Stub methods must be marked via AgentInfoUtil.isNotImplemented().
export function enhanceAgentController(clazz: EggProtoImplClass): void {
  // Only enhance classes marked by @AgentController decorator
  if (!AgentInfoUtil.isAgentController(clazz)) {
    return;
  }

  // Guard against repeated enhancement (e.g., multiple lifecycle hook calls)
  if (AgentInfoUtil.isEnhanced(clazz)) {
    return;
  }

  // Identify which methods are stubs vs user-defined
  const stubMethods = new Set<string>();
  for (const name of AGENT_METHOD_NAMES) {
    const method = clazz.prototype[name];
    if (!method || AgentInfoUtil.isNotImplemented(method)) {
      stubMethods.add(name);
    }
  }
  // Check streamRun separately (handled specially below)
  const streamRunIsStub = !clazz.prototype.streamRun || AgentInfoUtil.isNotImplemented(clazz.prototype.streamRun);

  // Wrap init() lifecycle to create AgentRuntime and install per-instance delegates
  const originalInit = clazz.prototype.init;
  clazz.prototype.init = async function () {
    // Allow user to provide custom store via createStore()
    let store: AgentStore;
    if (typeof this.createStore === 'function') {
      store = await this.createStore();
    } else {
      const dataDir = process.env.TEGG_AGENT_DATA_DIR || path.join(process.cwd(), '.agent-data');
      store = new FileAgentStore({ dataDir });
    }

    if (store.init) {
      await store.init();
    }

    const runtime = createAgentRuntime({ host: this, store });
    this[AGENT_RUNTIME] = runtime;

    // Install delegate methods on this instance (not on prototype)
    for (const methodName of stubMethods) {
      this[methodName] = (...args: unknown[]) => {
        return (runtime as any)[methodName](...args);
      };
    }

    // streamRun needs special handling: create SSEWriter from request context
    if (streamRunIsStub) {
      this.streamRun = async (input: CreateRunInput) => {
        const runtimeCtx = ContextHandler.getContext();
        if (!runtimeCtx) {
          throw new Error('streamRun must be called within a request context');
        }
        const ctx = runtimeCtx.get(EGG_CONTEXT);
        ctx.respond = false;
        const writer = new NodeSSEWriter(ctx.res);
        return runtime.streamRun(input, writer);
      };
    }

    if (originalInit) {
      await originalInit.call(this);
    }
  };

  // Wrap destroy() lifecycle to cleanup AgentRuntime
  const originalDestroy = clazz.prototype.destroy;
  clazz.prototype.destroy = async function () {
    if (this[AGENT_RUNTIME]) {
      await (this[AGENT_RUNTIME] as AgentRuntime).destroy();
    }

    if (originalDestroy) {
      await originalDestroy.call(this);
    }
  };

  AgentInfoUtil.setEnhanced(clazz);
}
