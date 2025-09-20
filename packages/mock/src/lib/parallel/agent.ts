import { debuglog } from 'node:util';
import path from 'node:path';

import { Base } from 'sdk-base';
import { detectPort } from 'detect-port';
import { importModule } from '@eggjs/utils';
import type { Agent as EggAgent } from 'egg';

import { context } from '../context.ts';
import { formatOptions } from '../format_options.ts';
import type { MockOptions, MockApplicationOptions } from '../types.ts';
import { sleep, rimraf } from '../utils.ts';
import { setCustomLoader } from '../mock_custom_loader.ts';
import { APP_INIT } from './util.ts';

const debug = debuglog('egg/mock/lib/parallel/agent');

export class MockAgent extends Base {
  declare options: MockApplicationOptions;
  baseDir: string;
  [APP_INIT] = false;
  #initOnListeners = new Set<any[]>();
  #initOnceListeners = new Set<any[]>();
  _instance: EggAgent;

  constructor(options: MockApplicationOptions) {
    super({ initMethod: '_init' });
    this.options = options;
    this.baseDir = this.options.baseDir;
  }

  async _init() {
    if (this.options.beforeInit) {
      await this.options.beforeInit(this);
      delete this.options.beforeInit;
    }
    if (this.options.clean !== false) {
      const logDir = path.join(this.options.baseDir, 'logs');
      try {
        await rimraf(logDir);
      } catch (err: any) {
        console.error(`remove log dir ${logDir} failed: ${err.stack}`);
      }
      const runDir = path.join(this.options.baseDir, 'run');
      try {
        await rimraf(runDir);
      } catch (err: any) {
        console.error(`remove run dir ${runDir} failed: ${err.stack}`);
      }
    }

    this.options.clusterPort = await detectPort();
    process.env.CLUSTER_PORT = String(this.options.clusterPort);
    debug('get clusterPort %s', this.options.clusterPort);
    const { Agent }: { Agent: typeof EggAgent } = await importModule(
      this.options.framework
    );

    const agent = (this._instance = new Agent({ ...this.options }));

    // egg-mock plugin need to override egg context
    Object.assign(agent.context, context);
    setCustomLoader(agent);

    debug('agent instantiate');
    this[APP_INIT] = true;
    debug('this[APP_INIT] = true');
    this.#bindEvents();
    await agent.ready();

    const msg = {
      action: 'egg-ready',
      data: this.options,
    };
    agent.messenger.onMessage(msg);
    debug('agent ready');
  }

  #bindEvents() {
    debug('bind cache events to agent');
    for (const args of this.#initOnListeners) {
      debug('on(%s), use cache and pass to agent', args);
      this._instance.on(args[0], args[1]);
      this.removeListener(args[0], args[1]);
    }
    for (const args of this.#initOnceListeners) {
      debug('once(%s), use cache and pass to agent', args);
      this._instance.once(args[0], args[1]);
      this.removeListener(args[0], args[1]);
    }
  }

  on(...args: any[]) {
    if (this[APP_INIT]) {
      debug('on(%s), pass to agent', args);
      this._instance.on(args[0], args[1]);
    } else {
      debug('on(%s), cache it because agent has not init', args);
      this.#initOnListeners.add(args);
      super.on(args[0], args[1]);
    }
    return this;
  }

  once(...args: any[]) {
    if (this[APP_INIT]) {
      debug('once(%s), pass to agent', args);
      this._instance.once(args[0], args[1]);
    } else {
      debug('once(%s), cache it because agent has not init', args);
      this.#initOnceListeners.add(args);
      super.on(args[0], args[1]);
    }
    return this;
  }

  /**
   * close agent
   */
  async _close() {
    if (this._instance) {
      await this._instance.close();
    } else {
      // when agent init throws an exception, must wait for agent quit gracefully
      await sleep(200);
    }
  }
}

export function createAgent(options: MockOptions) {
  return new MockAgent(formatOptions(options));
}
