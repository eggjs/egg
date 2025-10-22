import { existsSync } from 'node:fs';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';

export interface StartClusterOptions {
  framework: string;
  workers: number;
  port?: number;
  baseDir: string;
  env: string;
  execArgv: string[];
}

export async function startCluster(options: StartClusterOptions): Promise<void> {
  console.log('startCluster options: %o', options);
  const frameworkName = path.basename(options.framework);
  const port = options.port ?? 7001;
  const app = new Application(options);
  new Agent(options);

  function exitBySignal(signal: string) {
    return () => {
      console.log('[master] master is killed by signal %s, closing', signal);
      console.log('[master] exit with code:0');
      process.exit(0);
    };
  }

  // kill(2) Ctrl-C
  process.once('SIGINT', exitBySignal('SIGINT'));
  // kill(3) Ctrl-\
  process.once('SIGQUIT', exitBySignal('SIGQUIT'));
  // kill(15) default
  process.once('SIGTERM', exitBySignal('SIGTERM'));

  process.once('exit', exitBySignal('exit'));

  setTimeout(() => {
    console.log('exit by timeout');
    process.exit(1);
  }, 10000);

  await scheduler.wait(10);
  const appFile = path.join(options.baseDir, 'app.js');
  await run(appFile, app);
  const address = `http://127.0.0.1:${port}`;
  process.send?.({
    action: 'egg-ready',
    data: {
      address,
    },
  });
  console.log('startCluster done');
  console.log(`${frameworkName} started on ${address}`);
}

export class Application {
  #beforeCloseFns: (() => Promise<void>)[] = [];

  constructor(options: any) {
    console.log('Application', options);
    process.once('exit', (code) => {
      this.close()
        .then(() => {
          console.log('app close done');
        })
        .catch((error) => {
          console.error('app close failed: %s', error);
        });
      console.log('[app_worker] exit with code:%s', code);
    });
  }

  beforeClose(fn: () => Promise<void>): void {
    console.log('add beforeClose hook');
    this.#beforeCloseFns.push(fn);
  }

  async ready(): Promise<void> {
    console.log('app ready');
  }

  async close(): Promise<void> {
    console.log('app close beforeClose hooks');
    for (const fn of this.#beforeCloseFns) {
      await fn();
    }
    console.log('app close done');
  }
}

export class Agent {
  constructor(options: any) {
    console.log('Agent', options);
    process.once('exit', (code) => {
      console.log('[agent_worker] exit with code:%s', code);
    });
  }
}

async function run(file: string, appInstance: Application) {
  if (!existsSync(file)) {
    return;
  }

  console.log('run %s', file);
  try {
    const exports = await import(file);
    if (typeof exports.default === 'function') {
      await exports.default(appInstance);
    }
    // console.log('exports: %o', exports);
    // await app(appInstance);
    await appInstance.ready();
    console.log('run %s done', file);
  } catch (error) {
    console.error('run %s failed: %s', file, error);
    throw error;
  }
}
