import { strict as assert } from 'node:assert';
import { createApp, restore, MockApplication } from './utils.js';

describe.only('test/asyncSupport.test.ts', () => {
  afterEach(restore);
  let app: MockApplication;
  before(async () => {
    app = createApp('apps/async-app');
    await app.ready();
    assert.equal(Reflect.get(app, 'beforeStartExecuted'), true);
    assert.equal(Reflect.get(app, 'scheduleExecuted'), true);
  });
  after(async () => {
    await app.close();
    assert.equal(Reflect.get(app, 'beforeCloseExecuted'), true);
  });

  it('middleware, controller and service should support async functions', async () => {
    await app.httpRequest()
      .get('/api')
      .expect(200)
      .expect([ 'service', 'controller', 'router', 'middleware' ]);
  });
});
