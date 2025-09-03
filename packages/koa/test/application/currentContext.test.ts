import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import request from 'supertest';
import Koa from '../../src/index.ts';

describe('app.currentContext', () => {
  it('should get currentContext', async () => {
    const app = new Koa({});

    app.use(async ctx => {
      assert.equal(ctx, app.currentContext);

      // oxlint-disable-next-line promise/avoid-new
      await new Promise<void>(resolve => {
        setTimeout(() => {
          assert.equal(ctx, app.currentContext);
          resolve();
        }, 1);
      });
      // oxlint-disable-next-line promise/avoid-new
      await new Promise<void>(resolve => {
        assert.equal(ctx, app.currentContext);
        setImmediate(() => {
          assert.equal(ctx, app.currentContext);
          resolve();
        });
      });
      assert.equal(ctx, app.currentContext);
      assert.ok(app.currentContext);
      app.currentContext.body = 'ok';
    });

    const requestServer = async () => {
      assert.equal(app.currentContext, undefined);
      await request(app.callback()).get('/').expect('ok');
      assert.equal(app.currentContext, undefined);
    };

    await Promise.all([
      requestServer(),
      requestServer(),
      requestServer(),
      requestServer(),
      requestServer(),
    ]);
  });

  it('should get currentContext work', async () => {
    const app = new Koa({});

    app.use(async () => {
      throw new Error('error message');
    });

    // oxlint-disable-next-line promise/avoid-new
    const handleError = new Promise<void>((resolve, reject) => {
      app.on('error', (err, ctx) => {
        try {
          assert.equal(err.message, 'error message');
          assert.equal(app.currentContext, ctx);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    await request(app.callback()).get('/').expect('Internal Server Error');
    await handleError;
  });
});
