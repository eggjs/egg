import { debuglog } from 'node:util';
import { createRequire } from 'node:module';
import { mock } from './index.js';
import { setupAgent, closeAgent } from './lib/agent_handler.js';
import { getApp } from './lib/app_handler.js';
import { injectContext } from './lib/inject_context.js';

const debug = debuglog('@eggjs/mock/register');

export async function mochaGlobalSetup() {
  debug('mochaGlobalSetup, agent.setupAgent() start');
  await setupAgent();
  debug('mochaGlobalSetup, agent.setupAgent() end');
}

export async function mochaGlobalTeardown() {
  debug('mochaGlobalTeardown, agent.closeAgent() start');
  await closeAgent();
  debug('mochaGlobalTeardown, agent.closeAgent() end');
}

export const mochaHooks = {
  async beforeAll() {
    const app = await getApp();
    debug('mochaHooks.beforeAll call, _app: %s', app);
    if (app) {
      await app.ready();
    }
  },
  async afterEach() {
    const app = await getApp();
    debug('mochaHooks.afterEach call, _app: %s', app);
    if (app) {
      await app.backgroundTasksFinished();
    }
    await mock.restore();
  },
  async afterAll() {
    // skip auto app close on parallel
    if (process.env.ENABLE_MOCHA_PARALLEL) return;
    const app = await getApp();
    debug('mochaHooks.afterAll call, _app: %s', app);
    if (app) {
      await app.close();
    }
  },
};

/**
 * Find active node mocha instances.
 */
function findNodeJSMocha() {
  let children: any;
  if (typeof require === 'function') {
    children = require.cache || {};
  } else {
    // FIXME: not work on ESM
    children = createRequire(process.cwd()).cache || {};
    debug('createRequire on esm');
  }

  return Object.keys(children)
    .filter(function(child) {
      const val = children[child].exports;
      return typeof val === 'function' && val.name === 'Mocha';
    })
    .map(function(child) {
      return children[child].exports;
    });
}

import 'mocha';

const modules = findNodeJSMocha();
// console.error('modules length: %s', modules.length);

for (const module of modules) {
  if (!module) continue;
  injectContext(module);
}
