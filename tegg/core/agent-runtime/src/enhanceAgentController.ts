import path from 'node:path';

import { AgentInfoUtil } from '@eggjs/controller-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { AgentRuntime, AGENT_RUNTIME } from './AgentRuntime.ts';
import type { AgentStore } from './AgentStore.ts';
import { FileAgentStore } from './FileAgentStore.ts';

const AGENT_METHOD_NAMES = ['createThread', 'getThread', 'asyncRun', 'streamRun', 'syncRun', 'getRun', 'cancelRun'];

// Enhance an AgentController class with smart default implementations.
//
// Called by the plugin/controller lifecycle hook AFTER the decorator has set
// HTTP metadata and injected stub methods. Detects which methods are
// user-defined vs stubs (via AgentInfoUtil.isNotImplemented() marker)
// and replaces stubs with AgentRuntime-delegating methods.
// Also wraps init()/destroy() to manage the AgentRuntime lifecycle.
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

  // Wrap init() lifecycle to create AgentRuntime
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

    this[AGENT_RUNTIME] = new AgentRuntime(this, store);

    if (originalInit) {
      await originalInit.call(this);
    }
  };

  // Wrap destroy() lifecycle to cleanup AgentRuntime
  const originalDestroy = clazz.prototype.destroy;
  clazz.prototype.destroy = async function () {
    if (this[AGENT_RUNTIME]) {
      await this[AGENT_RUNTIME].destroy();
    }

    if (originalDestroy) {
      await originalDestroy.call(this);
    }
  };

  // Replace stub methods with AgentRuntime delegation
  for (const methodName of AGENT_METHOD_NAMES) {
    if (!stubMethods.has(methodName)) continue;
    clazz.prototype[methodName] = function (...args: unknown[]) {
      return (this[AGENT_RUNTIME] as AgentRuntime)[methodName as keyof AgentRuntime](...args);
    };
  }

  AgentInfoUtil.setEnhanced(clazz);
}
