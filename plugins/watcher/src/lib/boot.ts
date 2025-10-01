import { debuglog } from 'node:util';

import type { ILifecycleBoot, EggApplicationCore } from 'egg';

import { Watcher } from './watcher.ts';

const debug = debuglog('egg/watcher/lib/boot');

export class Boot implements ILifecycleBoot {
  #app: EggApplicationCore;

  constructor(appOrAgent: EggApplicationCore) {
    this.#app = appOrAgent;
    if (this.#app.options.mode === 'all-in-one-process') {
      debug('init watcher in all-in-one-process mode');
      // FIXME: should use single instance of Watcher for all-in-one-process mode, avoid network port listen
      this.#app.watcher = new Watcher(appOrAgent.config);
    } else {
      debug('init watcher in cluster mode');
      this.#app.watcher = this.#app
        .clusterWrapper(Watcher, {})
        .delegate('watch', 'subscribe')
        .create(appOrAgent.config);
    }
    this.#app.watcher
      .on('info', (msg: string, ...args: any[]) => this.#app.coreLogger.info(msg, ...args))
      .on('warn', (msg: string, ...args: any[]) => this.#app.coreLogger.warn(msg, ...args))
      .on('error', (msg: string, ...args: any[]) => this.#app.coreLogger.error(msg, ...args));
  }

  async didLoad(): Promise<void> {
    await this.#app.watcher.ready();
    this.#app.coreLogger.info('[@eggjs/watcher:%s] watcher start success', this.#app.type);
  }
}
