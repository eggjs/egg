import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

describe('test/mock_session.test.ts', () => {
  afterEach(mm.restore);

  describe('single process mode', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = mm.app({
        baseDir: getFixtures('demo'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should mock session', async () => {
      const obj = {
        user: {
          foo: 'bar',
        },
        hello: 'egg mock session data',
      };

      // const ctx = app.mockContext();
      app.mockSession(obj);
      // assert.deepEqual(ctx.session, obj);

      await app
        .httpRequest()
        .get('/session')
        .expect({
          user: {
            foo: 'bar',
          },
          hello: 'egg mock session data',
        });
    });

    it('should support mock session with plain type', async () => {
      const ctx = app.mockContext();
      (app as any).mockSession();
      app.mockSession('123');
      assert(ctx.session);
      assert(!(ctx as any).session.save);
      assert.equal(ctx.session, '123');
    });

    it('should mock restore', async () => {
      await app.httpRequest().get('/session').expect({});
    });
  });

  describe('cluster process mode', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = mm.cluster({
        baseDir: getFixtures('demo'),
      });
      return app.ready();
    });
    afterAll(() => app.close());

    it('should mock session', async () => {
      app.mockSession({
        user: {
          foo: 'bar',
        },
        hello: 'egg mock session data',
      });
      await app
        .httpRequest()
        .get('/session')
        .expect({
          user: {
            foo: 'bar',
          },
          hello: 'egg mock session data',
        });
    });

    it('should mock restore', async () => {
      await app.httpRequest().get('/session').expect({});
    });
  });
});
