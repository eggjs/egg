import fs from 'node:fs/promises';
import path from 'node:path';

import debounce from 'debounce';
import type { ILifecycleBoot, Agent } from 'egg';
import multimatch from 'multimatch';
import { exists } from 'utility';

import { isTimingFile } from './utils.ts';

export default class AgentBoot implements ILifecycleBoot {
  #agent: Agent;

  constructor(agent: Agent) {
    this.#agent = agent;
  }

  async didLoad(): Promise<void> {
    // clean all timing json
    const rundir = this.#agent.config.rundir;
    const stat = await exists(rundir);
    if (!stat) return;
    const files = await fs.readdir(rundir);
    for (const file of files) {
      if (!isTimingFile(file)) continue;
      await fs.rm(path.join(rundir, file), { force: true, recursive: true });
    }
  }

  // Set up the reload file watcher in `didReady` (agent is ready) instead of
  // `serverDidReady` (which waits for the app workers to be ready). The watcher
  // only needs the agent itself; waiting for the app server means file changes
  // that happen right after the workers start — but before `serverDidReady`
  // fires — are not being watched yet and get missed (the reload never triggers).
  // Starting the watch earlier closes that window without changing reload behavior.
  async didReady(): Promise<void> {
    const agent = this.#agent;
    // single process mode don't watch and reload
    if (agent.options && Reflect.get(agent.options, 'mode') === 'single') {
      return;
    }

    const logger = agent.logger;
    const baseDir = agent.config.baseDir;
    const config = agent.config.development;

    let watchDirs = config.overrideDefault ? [] : ['app', 'config', 'mocks', 'mocks_proxy', 'app.js'];

    watchDirs = watchDirs.concat(config.watchDirs).map((dir) => path.resolve(baseDir, dir));

    let ignoreReloadFileDirs = config.overrideIgnore
      ? []
      : ['app/views', 'app/view', 'app/assets', 'app/public', 'app/web'];

    ignoreReloadFileDirs = ignoreReloadFileDirs.concat(config.ignoreDirs).map((dir) => path.resolve(baseDir, dir));

    const reloadFile = debounce(function (info) {
      logger.warn(`[agent:development] reload worker because ${info.path} ${info.event}`);

      process.send!({
        to: 'master',
        action: 'reload-worker',
      });
    }, 200);

    // watch dirs to reload worker, will debounce 200ms
    /**
     * reload app worker:
     *   [AgentWorker] - on file change
     *    |-> emit reload-worker
     *   [Master] - receive reload-worker event
     *    |-> TODO: Mark worker will die
     *    |-> Fork new worker
     *      |-> kill old worker
     *
     * @param {Object} info - changed fileInfo
     */
    agent.watcher.watch(watchDirs, (info: any) => {
      if (!config.reloadOnDebug) {
        return;
      }

      if (isAssetsDir(info.path) || info.isDirectory) {
        return;
      }

      // don't reload if don't match
      if (config.reloadPattern && multimatch(info.path, config.reloadPattern).length === 0) {
        return;
      }

      reloadFile(info);
    });

    function isAssetsDir(filepath: string) {
      for (const ignorePath of ignoreReloadFileDirs) {
        if (filepath.startsWith(ignorePath)) {
          return true;
        }
      }
      return false;
    }
  }
}
