import { debuglog } from 'node:util';

import { importModule } from '@eggjs/utils';
import { EggConsoleLogger as ConsoleLogger } from 'egg-logger';

import { AppThreadWorker } from './utils/mode/impl/worker_threads/app.ts';
import { startAppWorker, type AppWorkerIO } from './worker_protocol/app.ts';
import { createProcessWorkerIO } from './worker_protocol/process.ts';

const debug = debuglog('egg/cluster/app_worker');

async function main() {
  // $ node app_worker.js options-json-string
  const options = JSON.parse(process.argv[2]) as {
    framework: string;
    baseDir: string;
    require?: string[];
    startMode?: 'process' | 'worker_threads';
    port: number;
    debugPort?: number;
    https?: object;
    sticky?: boolean;
    stickyWorkerPort?: number;
    reusePort?: boolean;
  };
  if (options.require) {
    // inject
    for (const mod of options.require) {
      await importModule(mod, {
        paths: [options.baseDir],
      });
    }
  }

  const workerIO: AppWorkerIO =
    options.startMode === 'worker_threads' ? (AppThreadWorker as unknown as AppWorkerIO) : createProcessWorkerIO();

  const consoleLogger = new ConsoleLogger({
    level: process.env.EGG_APP_WORKER_LOGGER_LEVEL,
  });
  const { Application } = await importModule(options.framework, {
    paths: [options.baseDir],
  });
  debug('[app_worker:%s] new Application with options %j', process.pid, options);
  let app: any;
  try {
    app = new Application(options);
  } catch (err) {
    consoleLogger.error(err);
    throw err;
  }

  startAppWorker(app, options, workerIO, consoleLogger);
}

main();
