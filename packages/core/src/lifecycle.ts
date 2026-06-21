import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { debuglog, format } from 'node:util';

import { EggConsoleLogger } from 'egg-logger';
import { Ready as ReadyObject, type ReadyFunctionArg } from 'get-ready';
import { isClass } from 'is-type-of';
import { Ready } from 'ready-callback';

import type { EggCore } from './egg.ts';
import utils from './utils/index.ts';
import type { Fun } from './utils/index.ts';
import type { Timing } from './utils/timing.ts';

const debug = debuglog('egg/core/lifecycle');

export interface ILifecycleBoot {
  // loader auto set 'fullPath' property on boot class
  fullPath?: string;
  /**
   * Ready to call configDidLoad,
   * Config, plugin files are referred,
   * this is the last chance to modify the config.
   */
  configWillLoad?(): void;

  /**
   * Config, plugin files have loaded
   */
  configDidLoad?(): void;

  /**
   * All files have loaded, start plugin here
   */
  didLoad?(): Promise<void>;

  /**
   * All plugins have started, can do some thing before app ready
   */
  willReady?(): Promise<void>;

  /**
   * Worker is ready, can do some things,
   * don't need to block the app boot
   */
  didReady?(err?: Error): Promise<void>;

  /**
   * Server is listening
   */
  serverDidReady?(): Promise<void>;

  /**
   * Do some thing before app close
   */
  beforeClose?(): Promise<void>;

  /**
   * Collect metadata for manifest generation (metadataOnly mode).
   * Called instead of configWillLoad/configDidLoad/didLoad/willReady
   * when the application is started with metadataOnly: true.
   */
  loadMetadata?(): Promise<void> | void;

  /**
   * Called before V8 serializes the heap for startup snapshot.
   * Clean up non-serializable resources: close file handles, clear timers,
   * remove process listeners, close network connections.
   * Executed in REVERSE registration order (like beforeClose).
   */
  snapshotWillSerialize?(): Promise<void> | void;

  /**
   * Called after V8 deserializes the heap from a startup snapshot.
   * Restore non-serializable resources: reopen file handles, recreate timers,
   * re-register process listeners, reinitialize connections.
   * Executed in FORWARD registration order (like configWillLoad).
   * After all hooks complete, the normal lifecycle resumes from configDidLoad.
   */
  snapshotDidDeserialize?(): Promise<void> | void;
}

export type BootImplClass<T = ILifecycleBoot> = new (...args: any[]) => T;

export interface LifecycleOptions {
  baseDir: string;
  app: EggCore;
  logger: EggConsoleLogger;
  /**
   * When true, the lifecycle stops after configWillLoad phase completes.
   * configDidLoad, didLoad, willReady, didReady, and serverDidReady hooks
   * are NOT called. Used for V8 startup snapshot construction — SDKs
   * typically execute during configDidLoad, opening connections and starting
   * timers which are not serializable. The handling is analogous to
   * metadataOnly mode: both short-circuit the lifecycle chain early.
   */
  snapshot?: boolean;
}

export type FunWithFullPath = Fun & { fullPath?: string };

export class Lifecycle extends EventEmitter {
  #init: boolean;
  #readyObject: ReadyObject;
  #bootHooks: (BootImplClass | ILifecycleBoot)[];
  #boots: ILifecycleBoot[];
  #isClosed: boolean;
  #isClosing: boolean;
  #metadataOnly: boolean;
  #snapshotBuilding: boolean;
  #closeFunctionSet: Set<FunWithFullPath>;
  loadReady: Ready;
  bootReady: Ready;
  options: LifecycleOptions;
  readyTimeout: number;

  constructor(options: Partial<LifecycleOptions>) {
    super();
    options.logger = options.logger ?? new EggConsoleLogger();
    this.options = options as LifecycleOptions;
    this.#readyObject = new ReadyObject();
    this.#bootHooks = [];
    this.#boots = [];
    this.#closeFunctionSet = new Set();
    this.#isClosed = false;
    this.#isClosing = false;
    this.#metadataOnly = false;
    this.#snapshotBuilding = false;
    this.#init = false;

    this.timing.start(`${this.options.app.type} Start`);
    // get app timeout from env or use default timeout 10 second
    const eggReadyTimeoutEnv = Number.parseInt(process.env.EGG_READY_TIMEOUT_ENV || '10000');
    assert(
      Number.isInteger(eggReadyTimeoutEnv),
      `process.env.EGG_READY_TIMEOUT_ENV ${process.env.EGG_READY_TIMEOUT_ENV} should be able to parseInt.`,
    );
    this.readyTimeout = eggReadyTimeoutEnv;

    this.#initReady();
    this.on('ready_stat', (data) => {
      this.logger.info('[egg/core/lifecycle:ready_stat] end ready task %s, remain %j', data.id, data.remain);
    }).on('ready_timeout', (id) => {
      this.logger.warn(
        '[egg/core/lifecycle:ready_timeout] %s seconds later %s was still unable to finish.',
        this.readyTimeout / 1000,
        id,
      );
    });

    this.ready((err) => {
      if (!this.#metadataOnly && !this.options.snapshot) {
        void this.triggerDidReady(err);
      }
      debug('app ready');
      this.timing.end(`${this.options.app.type} Start`);
    });
  }

  ready(): Promise<void>;
  ready(flagOrFunction: ReadyFunctionArg): void;
  ready(flagOrFunction?: ReadyFunctionArg) {
    if (flagOrFunction === undefined) {
      return this.#readyObject.ready();
    }
    return this.#readyObject.ready(flagOrFunction);
  }

  get app(): EggCore {
    return this.options.app;
  }

  /**
   * Whether `close()` has finished. Useful to guard lazy work (logger creation,
   * close-hook registration) that may run after the app/agent was torn down.
   */
  get isClosed(): boolean {
    return this.#isClosed;
  }

  /**
   * Whether `close()` is currently running (started but not yet finished). A
   * close hook registered during this window would be added after the close
   * callback snapshot is taken and would never run, so `registerBeforeClose()`
   * also refuses registration while closing.
   */
  get isClosing(): boolean {
    return this.#isClosing;
  }

  get logger(): EggConsoleLogger {
    return this.options.logger;
  }

  get timing(): Timing {
    return this.app.timing;
  }

  legacyReadyCallback(name: string, opt?: object): (...args: unknown[]) => void {
    const timingKeyPrefix = 'readyCallback';
    const timing = this.timing;
    const cb = this.loadReady.readyCallback(name, opt);
    const timingKey = `${timingKeyPrefix} in ` + utils.getResolvedFilename(name, this.app.baseDir);
    this.timing.start(timingKey);
    debug('register legacyReadyCallback');
    return function legacyReadyCallback(...args: unknown[]) {
      timing.end(timingKey);
      debug('end legacyReadyCallback');
      cb(...args);
    };
  }

  addBootHook(bootHootOrBootClass: BootImplClass | ILifecycleBoot): void {
    assert(this.#init === false, 'do not add hook when lifecycle has been initialized');
    this.#bootHooks.push(bootHootOrBootClass);
  }

  addFunctionAsBootHook<T = EggCore>(hook: (app: T) => void, fullPath?: string): void {
    assert(this.#init === false, 'do not add hook when lifecycle has been initialized');
    // app.js is exported as a function
    // call this function in configDidLoad
    class Boot implements ILifecycleBoot {
      static fullPath?: string;
      app: T;
      constructor(app: T) {
        this.app = app;
      }
      configDidLoad(): void {
        hook(this.app);
      }
    }
    Boot.fullPath = fullPath;
    this.#bootHooks.push(Boot);
  }

  /**
   * init boots and trigger config did config
   */
  init(): void {
    debug('%s init lifecycle', this.app.type);
    assert(this.#init === false, 'lifecycle have been init');
    this.#init = true;
    this.#boots = this.#bootHooks.map((BootHootOrBootClass) => {
      let instance = BootHootOrBootClass as ILifecycleBoot;
      if (isClass(BootHootOrBootClass)) {
        instance = new BootHootOrBootClass(this.app);
        if (!instance.fullPath && 'fullPath' in BootHootOrBootClass) {
          instance.fullPath = BootHootOrBootClass.fullPath as string;
        }
      }
      debug('[init] add boot instance: %o', instance.fullPath);
      return instance;
    });
  }

  registerBeforeStart(scope: Fun, name: string): void {
    debug('%s add registerBeforeStart, name: %o', this.options.app.type, name);
    this.#registerReadyCallback({
      scope,
      ready: this.loadReady,
      timingKeyPrefix: 'Before Start',
      scopeFullName: name,
    });
  }

  /**
   * Register a function to run during `close()`. Returns `false` when the
   * registration is refused because the app/agent is already closing or closed
   * (the hook would never run); `true` otherwise.
   */
  registerBeforeClose(fn: FunWithFullPath, fullPath?: string): boolean {
    assert(typeof fn === 'function', 'argument should be function');
    // A close hook may be registered after the app/agent has started closing
    // when teardown races an in-flight load — common under vitest `isolate:
    // false` on slow/Windows CI, where lazy logger creation (`coreLogger` access
    // during `dumpTiming` or the unhandledRejection handler) reaches here while
    // close is running or already done. Throwing "app has been closed" turned a
    // benign late call into an unhandled rejection that failed an unrelated test.
    // Once closing has begun the close-callback snapshot is fixed, so a new hook
    // would never fire — refuse it (returning false) instead of crashing, and
    // let the caller clean up its own resources.
    if (this.#isClosing || this.#isClosed) {
      debug('%s skip registerBeforeClose at %o, app is closing or has been closed', this.app.type, fullPath);
      return false;
    }
    if (fullPath) {
      fn.fullPath = fullPath;
    }
    this.#closeFunctionSet.add(fn);
    debug('%s register beforeClose at %o, count: %d', this.app.type, fullPath, this.#closeFunctionSet.size);
    return true;
  }

  async close(): Promise<void> {
    // Mark closing before the close-callback snapshot is taken, so any hook
    // registered while close() is in flight (e.g. an in-flight load racing
    // teardown) is refused by registerBeforeClose() instead of being stranded.
    this.#isClosing = true;
    if (this.#metadataOnly || this.#snapshotBuilding) {
      debug('%s skip beforeClose functions in early-exit lifecycle mode', this.app.type);
      this.#closeFunctionSet.clear();
    } else {
      // close in reverse order: first created, last closed
      const closeFns = Array.from(this.#closeFunctionSet);
      debug('%s start trigger %d beforeClose functions', this.app.type, closeFns.length);
      for (const fn of closeFns.reverse()) {
        debug('%s trigger beforeClose at %o', this.app.type, fn.fullPath);
        await utils.callFn(fn);
        this.#closeFunctionSet.delete(fn);
      }
    }

    // Be called after other close callbacks
    this.app.emit('close');
    this.removeAllListeners();
    this.app.removeAllListeners();
    this.#isClosed = true;
    debug('%s closed', this.app.type);
  }

  triggerConfigWillLoad(): void {
    debug('trigger configWillLoad start');
    for (const boot of this.#boots) {
      if (typeof boot.configWillLoad === 'function') {
        debug('trigger configWillLoad at %o', boot.fullPath);
        boot.configWillLoad();
      }
    }
    debug('trigger configWillLoad end');
    if (this.options.snapshot) {
      // Snapshot mode: stop AFTER configWillLoad, BEFORE configDidLoad.
      // SDKs typically execute during configDidLoad hooks — these open connections
      // and start timers which are not serializable in V8 startup snapshots.
      // Start loadReady so registerBeforeStart callbacks (e.g. load()) can complete
      // and drive readiness — callers can simply `await app.ready()` without
      // needing to distinguish snapshot from normal mode.
      debug('snapshot mode: stopping after configWillLoad, skipping configDidLoad and later phases');
      this.#snapshotBuilding = true;
      this.loadReady.start();
      return;
    }
    this.triggerConfigDidLoad();
  }

  triggerConfigDidLoad(): void {
    debug('trigger configDidLoad start');
    for (const boot of this.#boots) {
      if (typeof boot.configDidLoad === 'function') {
        debug('trigger configDidLoad at %o', boot.fullPath);
        boot.configDidLoad();
      }
      // function boot hook register after configDidLoad trigger
      if (typeof boot.beforeClose === 'function') {
        const beforeClose = boot.beforeClose.bind(boot);
        this.registerBeforeClose(beforeClose, boot.fullPath);
      }
    }
    debug('trigger configDidLoad end');
    this.triggerDidLoad();
  }

  triggerDidLoad(): void {
    debug('trigger didLoad start');
    debug('loadReady start');
    this.loadReady.start();
    for (const boot of this.#boots) {
      if (typeof boot.didLoad === 'function') {
        const didLoad = boot.didLoad.bind(boot);
        this.#registerReadyCallback({
          scope: didLoad,
          ready: this.loadReady,
          timingKeyPrefix: 'Did Load',
          scopeFullName: boot.fullPath + ':didLoad',
        });
      }
    }
  }

  triggerWillReady(): void {
    debug('trigger willReady start');
    debug('bootReady start');
    this.bootReady.start();
    for (const boot of this.#boots) {
      if (typeof boot.willReady === 'function') {
        const willReady = boot.willReady.bind(boot);
        this.#registerReadyCallback({
          scope: willReady,
          ready: this.bootReady,
          timingKeyPrefix: 'Will Ready',
          scopeFullName: boot.fullPath + ':willReady',
        });
      }
    }
  }

  triggerDidReady(err?: Error): Promise<void> {
    debug('trigger didReady start');
    return (async () => {
      for (const boot of this.#boots) {
        if (typeof boot.didReady === 'function') {
          debug('trigger didReady at %o', boot.fullPath);
          try {
            await boot.didReady(err);
          } catch (err) {
            debug('trigger didReady error at %o, error: %s', boot.fullPath, err);
            this.emit('error', err);
          }
        }
      }
      debug('trigger didReady end');
    })();
  }

  triggerServerDidReady(): Promise<void> {
    debug('trigger serverDidReady start');
    return (async () => {
      for (const boot of this.#boots) {
        if (typeof boot.serverDidReady !== 'function') {
          continue;
        }
        debug('trigger serverDidReady at %o', boot.fullPath);
        try {
          await boot.serverDidReady();
        } catch (err) {
          debug('trigger serverDidReady error at %o, error: %s', boot.fullPath, err);
          this.emit('error', err);
        }
      }
      debug('trigger serverDidReady end');
    })();
  }

  async triggerLoadMetadata(): Promise<void> {
    this.#metadataOnly = true;
    debug('trigger loadMetadata start');
    let firstError: Error | undefined;
    for (const boot of this.#boots) {
      if (typeof boot.loadMetadata === 'function') {
        debug('trigger loadMetadata at %o', boot.fullPath);
        try {
          await boot.loadMetadata();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          if (!firstError) firstError = error;
          debug('trigger loadMetadata error at %o, error: %s', boot.fullPath, error);
          this.emit('error', error);
        }
      }
    }
    debug('trigger loadMetadata end');
    this.ready(firstError ?? true);
  }

  /**
   * Trigger snapshotWillSerialize on all boots in REVERSE order.
   * Called by the build script before V8 serializes the heap.
   */
  async triggerSnapshotWillSerialize(): Promise<void> {
    if (!this.options.snapshot) {
      throw new Error('triggerSnapshotWillSerialize() can only be called on a snapshot-mode lifecycle');
    }
    debug('trigger snapshotWillSerialize start');
    const boots = [...this.#boots].reverse();
    for (const boot of boots) {
      if (typeof boot.snapshotWillSerialize !== 'function') {
        continue;
      }
      const fullPath = boot.fullPath ?? 'unknown';
      debug('trigger snapshotWillSerialize at %o', fullPath);
      const timingKey = `Snapshot Will Serialize in ${utils.getResolvedFilename(fullPath, this.app.baseDir)}`;
      this.timing.start(timingKey);
      try {
        await utils.callFn(boot.snapshotWillSerialize.bind(boot));
      } catch (err) {
        debug('trigger snapshotWillSerialize error at %o, error: %s', fullPath, err);
        this.timing.end(timingKey);
        throw err;
      }
      this.timing.end(timingKey);
    }
    debug('trigger snapshotWillSerialize end');
  }

  /**
   * Trigger snapshotDidDeserialize on all boots in FORWARD order.
   * Called by the restore entry after V8 deserializes the heap.
   * After all hooks complete, resets the ready state and resumes the normal
   * lifecycle from configDidLoad. The returned promise resolves when the
   * full lifecycle (configDidLoad → didLoad → willReady) has completed.
   */
  async triggerSnapshotDidDeserialize(): Promise<void> {
    if (!this.options.snapshot) {
      throw new Error('triggerSnapshotDidDeserialize() can only be called on a snapshot-mode lifecycle');
    }
    debug('trigger snapshotDidDeserialize start');
    for (const boot of this.#boots) {
      if (typeof boot.snapshotDidDeserialize !== 'function') {
        continue;
      }
      const fullPath = boot.fullPath ?? 'unknown';
      debug('trigger snapshotDidDeserialize at %o', fullPath);
      const timingKey = `Snapshot Did Deserialize in ${utils.getResolvedFilename(fullPath, this.app.baseDir)}`;
      this.timing.start(timingKey);
      try {
        await utils.callFn(boot.snapshotDidDeserialize.bind(boot));
      } catch (err) {
        debug('trigger snapshotDidDeserialize error at %o, error: %s', fullPath, err);
        this.timing.end(timingKey);
        throw err;
      }
      this.timing.end(timingKey);
    }
    debug('trigger snapshotDidDeserialize end');

    // Reset ready state for the resumed lifecycle.
    // In snapshot mode, ready(true) was called when loadReady completed,
    // resolving the ready promise early. We need fresh ready objects so the
    // resumed lifecycle (didLoad → willReady → didReady) can track properly.
    // Note: keep options.snapshot = true so the constructor's stale ready
    // callback (which may fire asynchronously) correctly skips triggerDidReady.
    this.#snapshotBuilding = false;
    this.#readyObject = new ReadyObject();
    this.#initReady();
    this.ready((err) => {
      void this.triggerDidReady(err);
      debug('app ready after snapshot deserialize');
    });

    // Resume the normal lifecycle from configDidLoad
    this.triggerConfigDidLoad();

    // Wait for the full resumed lifecycle to complete
    await this.ready();
  }

  #initReady(): void {
    debug('loadReady init');
    this.loadReady = new Ready({ timeout: this.readyTimeout, lazyStart: true });
    this.#delegateReadyEvent(this.loadReady);
    this.loadReady.ready((err?: Error) => {
      debug('loadReady end, err: %o', err);
      debug('trigger didLoad end');
      if (err) {
        this.ready(err);
      } else if (this.#snapshotBuilding) {
        // Snapshot build: skip willReady/bootReady phases, signal ready directly
        this.ready(true);
      } else {
        this.triggerWillReady();
      }
    });

    debug('bootReady init');
    this.bootReady = new Ready({ timeout: this.readyTimeout, lazyStart: true });
    this.#delegateReadyEvent(this.bootReady);
    this.bootReady.ready((err?: Error) => {
      debug('bootReady end, err: %o', err);
      debug('trigger willReady end');
      this.ready(err || true);
    });
  }

  #delegateReadyEvent(ready: Ready): void {
    ready.once('error', (err?: Error) => ready.ready(err));
    ready.on('ready_timeout', (id: unknown) => this.emit('ready_timeout', id));
    ready.on('ready_stat', (data: unknown) => this.emit('ready_stat', data));
    ready.on('error', (err?: Error) => this.emit('error', err));
  }

  #registerReadyCallback(args: { scope: Fun; ready: Ready; timingKeyPrefix: string; scopeFullName?: string }): void {
    const { scope, ready, timingKeyPrefix, scopeFullName } = args;
    if (typeof scope !== 'function') {
      throw new TypeError('boot only support function');
    }

    // get filename from stack if scopeFullName is undefined
    const name = scopeFullName || utils.getCalleeFromStack(true, 4);
    const timingKey = `${timingKeyPrefix} in ` + utils.getResolvedFilename(name, this.app.baseDir);

    this.timing.start(timingKey);

    debug('[registerReadyCallback] start name: %o', name);
    const done = ready.readyCallback(name);

    // ensure scope executes after load completed
    process.nextTick(async () => {
      try {
        await utils.callFn(scope);
        debug('[registerReadyCallback] end name: %o', name);
        done();
        this.timing.end(timingKey);
      } catch (e) {
        let err = e as Error;
        // avoid non-stringify error: TypeError: Cannot convert object to primitive value
        if (!(err instanceof Error)) {
          err = new Error(format('%s', err));
        }
        done(err);
        this.timing.end(timingKey);
      }
    });
  }
}
