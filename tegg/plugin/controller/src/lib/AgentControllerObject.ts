import path from 'node:path';

import {
  type AgentRuntime,
  type AgentControllerHost,
  type AgentRuntimeLogger,
  AGENT_RUNTIME,
  createAgentRuntime,
  FileAgentStore,
  NodeSSEWriter,
} from '@eggjs/agent-runtime';
import type { AgentStore } from '@eggjs/agent-runtime';
import { AgentInfoUtil } from '@eggjs/controller-decorator';
import type { CreateRunInput } from '@eggjs/controller-decorator';
import { IdenticalUtil } from '@eggjs/lifecycle';
import { LoadUnitFactory } from '@eggjs/metadata';
import { EGG_CONTEXT } from '@eggjs/module-common';
import { ContextHandler, EggContainerFactory, EggObjectLifecycleUtil, EggObjectUtil } from '@eggjs/tegg-runtime';
import type {
  EggObject,
  EggObjectLifeCycleContext,
  EggObjectLifecycle,
  EggObjectName,
  EggPrototype,
  EggPrototypeName,
} from '@eggjs/tegg-types';
import { EggObjectStatus, ObjectInitType } from '@eggjs/tegg-types';

import { AgentControllerProto } from './AgentControllerProto.ts';

/** Method names that can be delegated to AgentRuntime. */
type AgentMethodName = 'createThread' | 'getThread' | 'asyncRun' | 'syncRun' | 'getRun' | 'cancelRun';

const AGENT_METHOD_NAMES: AgentMethodName[] = [
  'createThread',
  'getThread',
  'asyncRun',
  'syncRun',
  'getRun',
  'cancelRun',
];

/**
 * Custom EggObject for @AgentController classes.
 *
 * Replicates the full EggObjectImpl.initWithInjectProperty lifecycle and
 * inserts AgentRuntime delegate installation between postInject and init
 * hooks — exactly where the user's `init()` expects runtime to be ready.
 */
export class AgentControllerObject implements EggObject {
  private static logger: AgentRuntimeLogger;

  private _obj!: object;
  private status: EggObjectStatus = EggObjectStatus.PENDING;
  private runtime: AgentRuntime | undefined;

  readonly id: string;
  readonly name: EggPrototypeName;
  readonly proto: AgentControllerProto;

  /** Inject a logger to be used by all AgentRuntime instances. */
  static setLogger(logger: AgentRuntimeLogger): void {
    AgentControllerObject.logger = logger;
  }

  constructor(name: EggObjectName, proto: AgentControllerProto) {
    this.name = name;
    this.proto = proto;
    const ctx = ContextHandler.getContext();
    this.id = IdenticalUtil.createObjectId(this.proto.id, ctx?.id);
  }

  get obj(): object {
    return this._obj;
  }

  get isReady(): boolean {
    return this.status === EggObjectStatus.READY;
  }

  injectProperty(name: EggObjectName, descriptor: PropertyDescriptor): void {
    Reflect.defineProperty(this._obj, name, descriptor);
  }

  /**
   * Full lifecycle sequence mirroring EggObjectImpl.initWithInjectProperty,
   * with AgentRuntime installation inserted between postInject and init.
   */
  async init(ctx: EggObjectLifeCycleContext): Promise<void> {
    try {
      // 1. Construct object
      this._obj = this.proto.constructEggObject();
      const objLifecycleHook = this._obj as EggObjectLifecycle;

      // 2. Global preCreate hook
      await EggObjectLifecycleUtil.objectPreCreate(ctx, this);

      // 3. Self postConstruct hook
      const postConstructMethod =
        EggObjectLifecycleUtil.getLifecycleHook('postConstruct', this.proto) ?? 'postConstruct';
      if (objLifecycleHook[postConstructMethod]) {
        await objLifecycleHook[postConstructMethod](ctx, this);
      }

      // 4. Self preInject hook
      const preInjectMethod = EggObjectLifecycleUtil.getLifecycleHook('preInject', this.proto) ?? 'preInject';
      if (objLifecycleHook[preInjectMethod]) {
        await objLifecycleHook[preInjectMethod](ctx, this);
      }

      // 5. Inject dependencies
      await Promise.all(
        this.proto.injectObjects.map(async (injectObject) => {
          const proto = injectObject.proto;
          const loadUnit = LoadUnitFactory.getLoadUnitById(proto.loadUnitId);
          if (!loadUnit) {
            throw new Error(`can not find load unit: ${proto.loadUnitId}`);
          }
          if (
            this.proto.initType !== ObjectInitType.CONTEXT &&
            injectObject.proto.initType === ObjectInitType.CONTEXT
          ) {
            this.injectProperty(
              injectObject.refName,
              EggObjectUtil.contextEggObjectGetProperty(proto, injectObject.objName),
            );
          } else {
            const injectObj = await EggContainerFactory.getOrCreateEggObject(proto, injectObject.objName);
            this.injectProperty(injectObject.refName, EggObjectUtil.eggObjectGetProperty(injectObj));
          }
        }),
      );

      // 6. Global postCreate hook
      await EggObjectLifecycleUtil.objectPostCreate(ctx, this);

      // 7. Self postInject hook
      const postInjectMethod = EggObjectLifecycleUtil.getLifecycleHook('postInject', this.proto) ?? 'postInject';
      if (objLifecycleHook[postInjectMethod]) {
        await objLifecycleHook[postInjectMethod](ctx, this);
      }

      // === AgentRuntime installation (before user init) ===
      await this.installAgentRuntime();

      // 8. Self init hook (user's init())
      const initMethod = EggObjectLifecycleUtil.getLifecycleHook('init', this.proto) ?? 'init';
      if (objLifecycleHook[initMethod]) {
        await objLifecycleHook[initMethod](ctx, this);
      }

      // 9. Ready
      this.status = EggObjectStatus.READY;
    } catch (e) {
      this.status = EggObjectStatus.ERROR;
      throw e;
    }
  }

  async destroy(ctx: EggObjectLifeCycleContext): Promise<void> {
    if (this.status === EggObjectStatus.READY) {
      this.status = EggObjectStatus.DESTROYING;

      // Destroy AgentRuntime first (waits for in-flight tasks)
      if (this.runtime) {
        await this.runtime.destroy();
      }

      // Global preDestroy hook
      await EggObjectLifecycleUtil.objectPreDestroy(ctx, this);

      // Self lifecycle hooks
      const objLifecycleHook = this._obj as EggObjectLifecycle;
      const preDestroyMethod = EggObjectLifecycleUtil.getLifecycleHook('preDestroy', this.proto) ?? 'preDestroy';
      if (objLifecycleHook[preDestroyMethod]) {
        await objLifecycleHook[preDestroyMethod](ctx, this);
      }

      const destroyMethod = EggObjectLifecycleUtil.getLifecycleHook('destroy', this.proto) ?? 'destroy';
      if (objLifecycleHook[destroyMethod]) {
        await objLifecycleHook[destroyMethod](ctx, this);
      }

      this.status = EggObjectStatus.DESTROYED;
    }
  }

  /**
   * Create AgentRuntime and install delegate methods on the instance.
   * Logic ported from the removed enhanceAgentController.ts.
   */
  private async installAgentRuntime(): Promise<void> {
    const instance = this._obj as Record<string | symbol, unknown>;

    // Determine which methods are stubs vs user-defined
    const stubMethods = new Set<AgentMethodName>();
    for (const name of AGENT_METHOD_NAMES) {
      const method = instance[name];
      if (typeof method !== 'function' || AgentInfoUtil.isNotImplemented(method)) {
        stubMethods.add(name);
      }
    }
    const streamRunFn = instance['streamRun'];
    const streamRunIsStub = typeof streamRunFn !== 'function' || AgentInfoUtil.isNotImplemented(streamRunFn);

    // Create store (support user-defined createStore())
    let store: AgentStore;
    const createStoreFn = instance['createStore'];
    if (typeof createStoreFn === 'function') {
      store = (await Reflect.apply(createStoreFn, this._obj, [])) as AgentStore;
    } else {
      const dataDir = process.env.TEGG_AGENT_DATA_DIR || path.join(process.cwd(), '.agent-data');
      store = new FileAgentStore({ dataDir });
    }
    if (store.init) {
      await store.init();
    }

    // Create runtime with injected logger
    const runtime = createAgentRuntime({
      host: this._obj as AgentControllerHost,
      store,
      logger: AgentControllerObject.logger,
    });
    this.runtime = runtime;
    instance[AGENT_RUNTIME] = runtime;

    // Install delegate methods for stubs (type-safe: all names are keys of AgentRuntime)
    for (const methodName of stubMethods) {
      const runtimeMethod = runtime[methodName].bind(runtime);
      instance[methodName] = runtimeMethod;
    }

    // streamRun needs special handling: create NodeSSEWriter from request context
    if (streamRunIsStub) {
      instance['streamRun'] = async (input: CreateRunInput): Promise<void> => {
        const runtimeCtx = ContextHandler.getContext();
        if (!runtimeCtx) {
          throw new Error('streamRun must be called within a request context');
        }
        const eggCtx = runtimeCtx.get(EGG_CONTEXT);
        eggCtx.respond = false;
        const writer = new NodeSSEWriter(eggCtx.res);
        return runtime.streamRun(input, writer);
      };
    }
  }

  static async createObject(
    name: EggObjectName,
    proto: EggPrototype,
    lifecycleContext: EggObjectLifeCycleContext,
  ): Promise<AgentControllerObject> {
    const obj = new AgentControllerObject(name, proto as AgentControllerProto);
    await obj.init(lifecycleContext);
    return obj;
  }
}
