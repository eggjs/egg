import { debuglog } from 'node:util';

import { mock } from './index.ts';
import { setupAgent, closeAgent } from './lib/agent_handler.ts';
import { getApp } from './lib/app_handler.ts';

const debug = debuglog('egg/mock/register');

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

import './inject_mocha.ts';
