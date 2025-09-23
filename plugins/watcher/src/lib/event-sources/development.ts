import { debuglog } from 'node:util';
import path from 'node:path';
import fs, { type FSWatcher, type WatchEventType } from 'node:fs';

import { BaseEventSource } from './base.ts';
import type { ChangeInfo } from '../types.ts';

const debug = debuglog('egg-watcher/lib/event-sources/development');

// only used by local dev environment
export default class DevelopmentEventSource extends BaseEventSource {
  #fileWatching = new Map<string, FSWatcher>();

  constructor() {
    super();
    this.ready(true);
  }

  watch(file: string) {
    try {
      const stat = fs.statSync(file, { throwIfNoEntry: false });
      if (!stat) {
        debug('watch %o ignore, file not exists', file);
        return;
      }
      debug('watch %o, isFile: %o', file, stat.isFile());
      // https://nodejs.org/docs/latest/api/fs.html#fswatchfilename-options-listener
      let recursive = true;
      if (process.platform === 'linux' && process.version.startsWith('v18.')) {
        // https://github.com/fgnass/filewatcher/pull/6
        // disable recursive on linux + Node.js <= 18
        recursive = false;
      }
      const handler = fs.watch(
        file,
        {
          persistent: true,
          recursive,
        },
        (event, filename) => {
          debug('watch %o => event: %o, filename: %o', file, event, filename);
          let changePath = file;
          if (stat.isFile()) {
            this.#onFsWatchChange(event, changePath);
          } else {
            // dir
            if (filename) {
              changePath = path.join(file, filename);
            }
            this.#onFsWatchChange(event, changePath);
          }
        }
      );
      // 保存 handler，用于解除监听
      this.#fileWatching.set(file, handler);
    } catch (e) {
      // file not exist, do nothing
      // do not emit error, in case of too many logs
      this.emit('warn', '[@eggjs/watcher:DevelopmentEventSource] watch %o error: %s', file, e);
    }
  }

  unwatch(file: string) {
    if (!file) return;

    const h = this.#fileWatching.get(file);
    if (!h) return;

    // fs.watch 文件监听
    h.removeAllListeners();
    h.close();
    this.#fileWatching.delete(file);
  }

  #onFsWatchChange(event: WatchEventType, file: string) {
    if (!file) {
      this.emit('warn', '[@eggjs/watcher:DevelopmentEventSource] event: %o', event);
      return;
    }
    // { event: 'change',
    // path: '/Users/mk2/git/changing/test/fixtures/foo.js',
    // stat:
    //  { dev: 16777220,
    //    mode: 33188,
    //    nlink: 1,
    //    uid: 501,
    //    gid: 20,
    //    rdev: 0,
    //    blksize: 4096,
    //    ino: 72656587,
    //    size: 11,
    //    blocks: 8,
    //    atime: Wed Jun 17 2015 00:08:11 GMT+0800 (CST),
    //    mtime: Wed Jun 17 2015 00:08:38 GMT+0800 (CST),
    //    ctime: Wed Jun 17 2015 00:08:38 GMT+0800 (CST),
    //    birthtime: Tue Jun 16 2015 23:19:13 GMT+0800 (CST) } }
    const stat = fs.statSync(file, { throwIfNoEntry: false });
    const info = {
      path: file,
      event,
      stat,
      isDirectory: stat?.isDirectory(),
    } as ChangeInfo;
    this.emit('change', info);
  }
}
