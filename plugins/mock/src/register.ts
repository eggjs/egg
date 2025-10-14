import { debuglog } from 'node:util';

import { mock } from './index.ts';
import { setupAgent, closeAgent } from './lib/agent_handler.ts';
import { getApp } from './lib/app_handler.ts';

const debug = debuglog('egg/mock/register');

export async function mochaGlobalSetup(): Promise<void> {
  debug('mochaGlobalSetup, agent.setupAgent() start');
  await setupAgent();
  debug('mochaGlobalSetup, agent.setupAgent() end');
}

export async function mochaGlobalTeardown(): Promise<void> {
  debug('mochaGlobalTeardown, agent.closeAgent() start');
  await closeAgent();
  debug('mochaGlobalTeardown, agent.closeAgent() end');
}

export const mochaHooks: {
  beforeAll: () => Promise<void>;
  afterEach: () => Promise<void>;
  afterAll: () => Promise<void>;
} = {
  async beforeAll(): Promise<void> {
    const app = await getApp();
    debug('mochaHooks.beforeAll call, _app: %s', app);
    if (app) {
      await app.ready();
    }
  },
  async afterEach(): Promise<void> {
    const app = await getApp();
    debug('mochaHooks.afterEach call, _app: %s', app);
    if (app) {
      await app.backgroundTasksFinished();
    }
    await mock.restore();
  },
  async afterAll(): Promise<void> {
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
