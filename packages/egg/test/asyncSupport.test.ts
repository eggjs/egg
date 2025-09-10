import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import { createApp, restore, MockApplication } from './utils.ts';

describe.skipIf(process.platform === 'win32')(
  'test/asyncSupport.test.ts',
  () => {
    afterEach(restore);

    let app: MockApplication;
    beforeAll(async () => {
      app = createApp('apps/async-app');
      await app.ready();
      assert.equal(Reflect.get(app, 'beforeStartExecuted'), true);
      assert.equal(Reflect.get(app, 'scheduleExecuted'), true);
    });
    afterAll(async () => {
      await app.close();
      assert.equal(Reflect.get(app, 'beforeCloseExecuted'), true);
    });

    it('middleware, controller and service should support async functions', async () => {
      await app
        .httpRequest()
        .get('/api')
        .expect(200)
        .expect(['service', 'controller', 'router', 'middleware']);
    });
  }
);
