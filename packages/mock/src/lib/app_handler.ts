import { debuglog } from 'node:util';

import { createApp as createParallelApp } from './parallel/app.ts';
import { setupAgent } from './agent_handler.ts';
import { createApp } from './app.ts';
import { restore } from './restore.ts';
import { getEggOptions } from './utils.ts';
import ApplicationUnittest from '../app/extend/application.ts';

const debug = debuglog('egg/mock/lib/app_handler');

declare namespace globalThis {
  let __eggMockAppInstance: ApplicationUnittest | null;
}

globalThis.__eggMockAppInstance = null;

export function setupApp() {
  let app = globalThis.__eggMockAppInstance!;
  if (app) {
    debug('return exists app');
    return app;
  }

  const options = getEggOptions();
  debug(
    'env.ENABLE_MOCHA_PARALLEL: %s, process.env.AUTO_AGENT: %s',
    process.env.ENABLE_MOCHA_PARALLEL,
    process.env.AUTO_AGENT
  );
  if (process.env.ENABLE_MOCHA_PARALLEL && process.env.AUTO_AGENT) {
    // setup agent first
    app = createParallelApp({
      ...options,
      beforeInit: async parallelApp => {
        const agent = await setupAgent();
        parallelApp.options.clusterPort = agent.options.clusterPort;
        debug(
          'mockParallelApp beforeInit get clusterPort: %s',
          parallelApp.options.clusterPort
        );
      },
    });
    debug('mockParallelApp app: %s', !!app);
  } else {
    app = createApp(options) as unknown as ApplicationUnittest;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof beforeAll === 'function') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // jest
      beforeAll(() => app.ready());
    }
    // @ts-ignore mocha tsd
    if (typeof afterEach === 'function') {
      // mocha and jest
      // @ts-ignore mocha tsd
      afterEach(() => app.backgroundTasksFinished());
      // @ts-ignore mocha tsd
      afterEach(restore);
    }
  }
  globalThis.__eggMockAppInstance = app;
  return app;
}

let getAppCallback: (suite: unknown, test?: unknown) => any;

export function setGetAppCallback(cb: (suite: unknown, test?: unknown) => any) {
  getAppCallback = cb;
}

export async function getApp(suite?: unknown, test?: unknown) {
  if (getAppCallback) {
    return getAppCallback(suite, test);
  }
  const app = globalThis.__eggMockAppInstance!;
  if (app) {
    await app.ready();
  }
  return app;
}

export function getBootstrapApp() {
  return globalThis.__eggMockAppInstance!;
}
