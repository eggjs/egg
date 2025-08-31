import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { debuglog, format } from 'node:util';

import { isClass } from 'is-type-of';
import { Ready as ReadyObject, type ReadyFunctionArg } from 'get-ready';
import { Ready } from 'ready-callback';
import { EggConsoleLogger } from 'egg-logger';

import utils from './utils/index.js';
import type { Fun } from './utils/index.js';
import type { EggCore } from './egg.js';

const debug = debuglog('@eggjs/core/lifecycle');

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
}

export type BootImplClass<T = ILifecycleBoot> = new (...args: any[]) => T;

export interface LifecycleOptions {
  baseDir: string;
  app: EggCore;
  logger: EggConsoleLogger;
}

export type FunWithFullPath = Fun & { fullPath?: string };

export class Lifecycle extends EventEmitter {
  #init: boolean;
  #readyObject: ReadyObject;
  #bootHooks: (BootImplClass | ILifecycleBoot)[];
  #boots: ILifecycleBoot[];
  #isClosed: boolean;
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
    this.#init = false;

    this.timing.start(`${this.options.app.type} Start`);
    // get app timeout from env or use default timeout 10 second
    const eggReadyTimeoutEnv = Number.parseInt(
      process.env.EGG_READY_TIMEOUT_ENV || '10000'
    );
    assert(
      Number.isInteger(eggReadyTimeoutEnv),
      `process.env.EGG_READY_TIMEOUT_ENV ${process.env.EGG_READY_TIMEOUT_ENV} should be able to parseInt.`
    );
    this.readyTimeout = eggReadyTimeoutEnv;

    this.#initReady();
    this.on('ready_stat', data => {
      this.logger.info(
        '[@eggjs/core/lifecycle:ready_stat] end ready task %s, remain %j',
        data.id,
        data.remain
      );
    }).on('ready_timeout', id => {
      this.logger.warn(
        '[@eggjs/core/lifecycle:ready_timeout] %s seconds later %s was still unable to finish.',
        this.readyTimeout / 1000,
        id
      );
    });

    this.ready(err => {
      this.triggerDidReady(err);
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

  get app() {
    return this.options.app;
  }

  get logger() {
    return this.options.logger;
  }

  get timing() {
    return this.app.timing;
  }

  legacyReadyCallback(name: string, opt?: object) {
    const timingKeyPrefix = 'readyCallback';
    const timing = this.timing;
    const cb = this.loadReady.readyCallback(name, opt);
    const timingKey =
      `${timingKeyPrefix} in ` +
      utils.getResolvedFilename(name, this.app.baseDir);
    this.timing.start(timingKey);
    debug('register legacyReadyCallback');
    return function legacyReadyCallback(...args: unknown[]) {
      timing.end(timingKey);
      debug('end legacyReadyCallback');
      cb(...args);
    };
  }

  addBootHook(bootHootOrBootClass: BootImplClass | ILifecycleBoot) {
    assert(
      this.#init === false,
      'do not add hook when lifecycle has been initialized'
    );
    this.#bootHooks.push(bootHootOrBootClass);
  }

  addFunctionAsBootHook<T = EggCore>(
    hook: (app: T) => void,
    fullPath?: string
  ) {
    assert(
      this.#init === false,
      'do not add hook when lifecycle has been initialized'
    );
    // app.js is exported as a function
    // call this function in configDidLoad
    class Boot implements ILifecycleBoot {
      static fullPath?: string;
      app: T;
      constructor(app: T) {
        this.app = app;
      }
      configDidLoad() {
        hook(this.app);
      }
    }
    Boot.fullPath = fullPath;
    this.#bootHooks.push(Boot);
  }

  /**
   * init boots and trigger config did config
   */
  init() {
    debug('%s init lifecycle', this.app.type);
    assert(this.#init === false, 'lifecycle have been init');
    this.#init = true;
    this.#boots = this.#bootHooks.map(BootHootOrBootClass => {
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

  registerBeforeStart(scope: Fun, name: string) {
    debug('%s add registerBeforeStart, name: %o', this.options.app.type, name);
    this.#registerReadyCallback({
      scope,
      ready: this.loadReady,
      timingKeyPrefix: 'Before Start',
      scopeFullName: name,
    });
  }

  registerBeforeClose(fn: FunWithFullPath, fullPath?: string) {
    assert(typeof fn === 'function', 'argument should be function');
    assert(this.#isClosed === false, 'app has been closed');
    if (fullPath) {
      fn.fullPath = fullPath;
    }
    this.#closeFunctionSet.add(fn);
    debug(
      '%s register beforeClose at %o, count: %d',
      this.app.type,
      fullPath,
      this.#closeFunctionSet.size
    );
  }

  async close() {
    // close in reverse order: first created, last closed
    const closeFns = Array.from(this.#closeFunctionSet);
    debug(
      '%s start trigger %d beforeClose functions',
      this.app.type,
      closeFns.length
    );
    for (const fn of closeFns.reverse()) {
      debug('%s trigger beforeClose at %o', this.app.type, fn.fullPath);
      await utils.callFn(fn);
      this.#closeFunctionSet.delete(fn);
    }
    // Be called after other close callbacks
    this.app.emit('close');
    this.removeAllListeners();
    this.app.removeAllListeners();
    this.#isClosed = true;
    debug('%s closed', this.app.type);
  }

  triggerConfigWillLoad() {
    debug('trigger configWillLoad start');
    for (const boot of this.#boots) {
      if (typeof boot.configWillLoad === 'function') {
        debug('trigger configWillLoad at %o', boot.fullPath);
        boot.configWillLoad();
      }
    }
    debug('trigger configWillLoad end');
    this.triggerConfigDidLoad();
  }

  triggerConfigDidLoad() {
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

  triggerDidLoad() {
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

  triggerWillReady() {
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

  triggerDidReady(err?: Error) {
    debug('trigger didReady start');
    return (async () => {
      for (const boot of this.#boots) {
        if (typeof boot.didReady === 'function') {
          debug('trigger didReady at %o', boot.fullPath);
          try {
            await boot.didReady(err);
          } catch (err) {
            debug(
              'trigger didReady error at %o, error: %s',
              boot.fullPath,
              err
            );
            this.emit('error', err);
          }
        }
      }
      debug('trigger didReady end');
    })();
  }

  triggerServerDidReady() {
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
          debug(
            'trigger serverDidReady error at %o, error: %s',
            boot.fullPath,
            err
          );
          this.emit('error', err);
        }
      }
      debug('trigger serverDidReady end');
    })();
  }

  #initReady() {
    debug('loadReady init');
    this.loadReady = new Ready({ timeout: this.readyTimeout, lazyStart: true });
    this.#delegateReadyEvent(this.loadReady);
    this.loadReady.ready((err?: Error) => {
      debug('loadReady end, err: %o', err);
      debug('trigger didLoad end');
      if (err) {
        this.ready(err);
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

  #delegateReadyEvent(ready: Ready) {
    ready.once('error', (err?: Error) => ready.ready(err));
    ready.on('ready_timeout', (id: unknown) => this.emit('ready_timeout', id));
    ready.on('ready_stat', (data: unknown) => this.emit('ready_stat', data));
    ready.on('error', (err?: Error) => this.emit('error', err));
  }

  #registerReadyCallback(args: {
    scope: Fun;
    ready: Ready;
    timingKeyPrefix: string;
    scopeFullName?: string;
  }) {
    const { scope, ready, timingKeyPrefix, scopeFullName } = args;
    if (typeof scope !== 'function') {
      throw new TypeError('boot only support function');
    }

    // get filename from stack if scopeFullName is undefined
    const name = scopeFullName || utils.getCalleeFromStack(true, 4);
    const timingKey =
      `${timingKeyPrefix} in ` +
      utils.getResolvedFilename(name, this.app.baseDir);

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
