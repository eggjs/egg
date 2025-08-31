import { strict as assert } from 'node:assert';
import { AsyncLocalStorage } from 'node:async_hooks';
import { request } from '@eggjs/supertest';
import { getAsyncLocalStorage, kGALS } from 'gals';
import { getFilepath } from './helper.js';
import { Application } from './fixtures/egg-esm/index.js';

describe('test/asyncLocalStorage.test.ts', () => {
  let app: Application;
  before(async () => {
    app = new Application({
      baseDir: getFilepath('session-cache-app'),
      type: 'application',
    });
    await app.loader.loadAll();
  });

  it('should start app with asyncLocalStorage = true by default', async () => {
    assert.equal(app.currentContext, undefined);
    const res1 = await request(app.callback()).get('/status');
    assert.equal(res1.status, 200);
    assert.equal(res1.text, 'egg status');
    const res = await request(app.callback()).get('/');
    assert.equal(res.status, 200);
    // console.log(res.body);
    assert.equal(res.body.sessionId, 'mock-session-id-123');
    assert(res.body.traceId);
    assert.equal(app.currentContext, undefined);
  });

  it('should access als on global', async () => {
    assert(Reflect.get(global, Symbol.for('gals#asyncLocalStorage')));
    assert(Reflect.get(global, kGALS));
    assert(
      Reflect.get(global, Symbol.for('gals#asyncLocalStorage')) instanceof
        AsyncLocalStorage
    );
    assert.equal(
      app.ctxStorage,
      Reflect.get(global, Symbol.for('gals#asyncLocalStorage'))
    );
    assert.equal(app.ctxStorage, getAsyncLocalStorage());
  });
});
