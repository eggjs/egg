import path from 'node:path';

import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { AGENT_DEFAULT_FACTORIES } from './agentDefaults.ts';
import type { AgentStore } from './AgentStore.ts';
import { FileAgentStore } from './FileAgentStore.ts';

const AGENT_METHOD_NAMES = ['createThread', 'getThread', 'asyncRun', 'streamRun', 'syncRun', 'getRun', 'cancelRun'];

const NOT_IMPLEMENTED = Symbol.for('AGENT_NOT_IMPLEMENTED');
const AGENT_ENHANCED = Symbol.for('AGENT_CONTROLLER_ENHANCED');

// Enhance an AgentController class with smart default implementations.
//
// Called by the plugin/controller lifecycle hook AFTER the decorator has set
// HTTP metadata and injected stub methods. Detects which methods are
// user-defined vs stubs (via Symbol.for('AGENT_NOT_IMPLEMENTED') marker)
// and replaces stubs with store-backed default implementations.
// Also wraps init()/destroy() to manage the AgentStore lifecycle.
//
// Prerequisites:
// - The class must be marked with Symbol.for('AGENT_CONTROLLER') (otherwise this is a no-op).
// - Stub methods must be marked with Symbol.for('AGENT_NOT_IMPLEMENTED').
export function enhanceAgentController(clazz: EggProtoImplClass): void {
  // Only enhance classes marked by @AgentController decorator
  if (!(clazz as any)[Symbol.for('AGENT_CONTROLLER')]) {
    return;
  }

  // Guard against repeated enhancement (e.g., multiple lifecycle hook calls)
  if ((clazz as any)[AGENT_ENHANCED]) {
    return;
  }

  // Identify which methods are stubs vs user-defined
  const stubMethods = new Set<string>();
  for (const name of AGENT_METHOD_NAMES) {
    const method = clazz.prototype[name];
    if (!method || (method as any)[NOT_IMPLEMENTED]) {
      stubMethods.add(name);
    }
  }

  // Wrap init() lifecycle to create store and task tracking
  const originalInit = clazz.prototype.init;
  clazz.prototype.init = async function () {
    // Allow user to provide custom store via createStore()
    if (typeof this.createStore === 'function') {
      this.__agentStore = await this.createStore();
    } else {
      const dataDir = process.env.TEGG_AGENT_DATA_DIR || path.join(process.cwd(), '.agent-data');
      this.__agentStore = new FileAgentStore({ dataDir });
    }

    if (this.__agentStore.init) {
      await (this.__agentStore as AgentStore).init!();
    }

    this.__runningTasks = new Map();

    if (originalInit) {
      await originalInit.call(this);
    }
  };

  // Wrap destroy() lifecycle to wait for in-flight tasks and cleanup
  const originalDestroy = clazz.prototype.destroy;
  clazz.prototype.destroy = async function () {
    // Wait for in-flight background tasks
    if (this.__runningTasks?.size) {
      const pending = Array.from(this.__runningTasks.values()).map((t: any) => t.promise);
      await Promise.allSettled(pending);
    }

    // Destroy store
    if (this.__agentStore?.destroy) {
      await this.__agentStore.destroy();
    }

    if (originalDestroy) {
      await originalDestroy.call(this);
    }
  };

  // Inject smart defaults for stub methods
  for (const methodName of AGENT_METHOD_NAMES) {
    if (!stubMethods.has(methodName)) continue;
    const factory = AGENT_DEFAULT_FACTORIES[methodName];
    if (factory) {
      clazz.prototype[methodName] = factory();
    }
  }

  (clazz as any)[AGENT_ENHANCED] = true;
}
