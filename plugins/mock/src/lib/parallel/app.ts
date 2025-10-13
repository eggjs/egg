import { debuglog } from 'node:util';

import { Base } from 'sdk-base';
import { importModule } from '@eggjs/utils';
import { Application as EggApplication } from 'egg';

import { context } from '../context.ts';
import { formatOptions } from '../format_options.ts';
import type { MockOptions, MockApplicationOptions } from '../types.ts';
import { sleep } from '../utils.ts';
import { setCustomLoader } from '../mock_custom_loader.ts';
import { createServer } from '../mock_http_server.ts';
import { proxyApp } from './util.ts';

const debug = debuglog('egg/mock/lib/parallel/app');

export class MockParallelApplication extends Base {
  declare options: MockApplicationOptions;
  baseDir: string;
  __APP_INIT__ = false;
  #initOnListeners = new Set<any[]>();
  #initOnceListeners = new Set<any[]>();
  _instance: EggApplication;

  constructor(options: MockApplicationOptions) {
    super({ initMethod: '_init' });
    this.options = options;
    this.baseDir = options.baseDir;
  }

  async _init(): Promise<void> {
    if (this.options.beforeInit) {
      await this.options.beforeInit(this);
      delete this.options.beforeInit;
    }

    if (!this.options.clusterPort) {
      this.options.clusterPort = parseInt(process.env.CLUSTER_PORT!);
    }
    if (!this.options.clusterPort) {
      throw new Error('cannot get env.CLUSTER_PORT, parallel run fail');
    }
    debug('get clusterPort %s', this.options.clusterPort);
    const { Application }: { Application: typeof EggApplication } = await importModule(this.options.framework);

    const app = (this._instance = new Application({ ...this.options }));

    // egg-mock plugin need to override egg context
    Object.assign(app.context, context);
    setCustomLoader(app);

    debug('app instantiate');
    this.__APP_INIT__ = true;
    debug('this[APP_INIT] = true');
    this.#bindEvents();
    debug('http server instantiate');
    createServer(app);
    await app.ready();

    const msg = {
      action: 'egg-ready',
      data: this.options,
    };
    (app as any).messenger.onMessage(msg);
    debug('app ready');
  }

  #bindEvents(): void {
    for (const args of this.#initOnListeners) {
      debug('on(%s), use cache and pass to app', args);
      this._instance.on(args[0], args[1]);
      this.removeListener(args[0], args[1]);
    }
    for (const args of this.#initOnceListeners) {
      debug('once(%s), use cache and pass to app', args);
      this._instance.once(args[0], args[1]);
      this.removeListener(args[0], args[1]);
    }
  }

  on(...args: any[]): this {
    if (this.__APP_INIT__) {
      debug('on(%s), pass to app', args);
      this._instance.on(args[0], args[1]);
    } else {
      debug('on(%s), cache it because app has not init', args);
      if (this.#initOnListeners) {
        this.#initOnListeners.add(args);
      }
      super.on(args[0], args[1]);
    }
    return this;
  }

  once(...args: any[]): this {
    if (this.__APP_INIT__) {
      debug('once(%s), pass to app', args);
      this._instance.once(args[0], args[1]);
    } else {
      debug('once(%s), cache it because app has not init', args);
      if (this.#initOnceListeners) {
        this.#initOnceListeners.add(args);
      }
      super.on(args[0], args[1]);
    }
    return this;
  }

  /**
   * close app
   */
  async _close(): Promise<void> {
    if (this._instance) {
      await this._instance.close();
    } else {
      // when app init throws an exception, must wait for app quit gracefully
      await sleep(200);
    }
  }
}

export function createApp(initOptions: MockOptions): ReturnType<typeof proxyApp> {
  const app = new MockParallelApplication(formatOptions(initOptions));
  return proxyApp(app);
}
