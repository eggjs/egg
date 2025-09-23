import { debuglog } from 'node:util';

import { Base } from 'sdk-base';
import camelcase from 'camelcase';
import { importModule } from '@eggjs/utils';
import type { EggAppConfig } from 'egg';

import { BaseEventSource } from './event-sources/base.ts';
import { isEqualOrParentPath } from './utils.ts';
import type { ChangeInfo } from './types.ts';

const debug = debuglog('egg-watcher/lib/watcher');

export type WatchListener = (info: ChangeInfo) => void;

export class Watcher extends Base {
  #config: EggAppConfig;
  #eventSource: BaseEventSource;

  constructor(config: EggAppConfig) {
    super({
      initMethod: '_init',
    });
    this.#config = config;
  }

  protected async _init() {
    const watcherType = this.#config.watcher?.type;
    if (!watcherType) {
      // If watcher config is not defined, skip initialization
      return;
    }
    let EventSource = this.#config.watcher?.eventSources[watcherType] as unknown as typeof BaseEventSource;
    if (typeof EventSource === 'string') {
      EventSource = await importModule(EventSource, {
        importDefaultOnly: true,
      });
    }

    // chokidar => watcherChokidar
    // custom => watcherCustom
    //
    // e.g:
    // config => { watcher: { type: 'custom' },  watcherCustom: { ... } }
    const key = camelcase(['watcher', watcherType]);
    const eventSourceOptions = this.#config[key] ?? {};
    this.#eventSource = Reflect.construct(EventSource, [eventSourceOptions]);
    this.#eventSource
      .on('change', this.#onChange.bind(this))
      .on('fuzzy-change', this.#onFuzzyChange.bind(this))
      .on('info', (...args) => this.emit('info', ...args))
      .on('warn', (...args) => this.emit('warn', ...args))
      .on('error', (...args) => this.emit('error', ...args));
    await this.#eventSource.ready();
  }

  watch(path: string | string[], listener: WatchListener) {
    this.emit('info', '[@eggjs/watcher] Start watching: %j', path);
    if (!path) return;

    // support array
    if (Array.isArray(path)) {
      path.forEach(p => this.watch(p, listener));
      return;
    }

    // one file only watch once
    if (!this.listenerCount(path)) {
      this.#eventSource.watch(path);
    }
    this.on(path, listener);
  }

  /*
  // TODO wait unsubscribe implementation of cluster-client
  unwatch(path, callback) {
    if (!path) return;

    // support array
    if (Array.isArray(path)) {
      path.forEach(p => this.unwatch(p, callback));
      return;
    }

    if (callback) {
      this.removeListener(path, callback);
      // stop watching when no listener bound to the path
      if (this.listenerCount(path) === 0) {
        this._eventSource.unwatch(path);
      }
      return;
    }

    this.removeAllListeners(path);
    this._eventSource.unwatch(path);
  }
  */

  #onChange(info: ChangeInfo) {
    debug('onChange %o', info);
    this.emit('info', '[@eggjs/watcher] Received a change event from eventSource: %j', info);
    const path = info.path;

    for (const p of this.eventNames()) {
      if (typeof p !== 'string') continue;
      // if it is a sub path, emit a `change` event
      if (isEqualOrParentPath(p, path)) {
        this.emit(p, info);
      }
    }
  }

  #onFuzzyChange(info: ChangeInfo) {
    debug('onFuzzyChange %o', info);
    this.emit('info', '[@eggjs/watcher] Received a fuzzy-change event from eventSource: %j', info);
    const path = info.path;

    for (const p of this.eventNames()) {
      if (typeof p !== 'string') continue;
      // if it is a parent path, emit a `change` event
      // just the opposite to `_onChange`
      if (isEqualOrParentPath(path, p)) {
        this.emit(p, info);
      }
    }
  }
}
