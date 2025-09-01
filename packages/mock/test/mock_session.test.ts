import { strict as assert } from 'node:assert';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/mock_session.test.ts', () => {
  afterEach(mm.restore);

  describe('single process mode', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir: getFixtures('demo'),
      });
      return app.ready();
    });
    after(() => app.close());

    it('should mock session', () => {
      const obj = {
        user: {
          foo: 'bar',
        },
        hello: 'egg mock session data',
      };

      // const ctx = app.mockContext();
      app.mockSession(obj);
      // assert.deepEqual(ctx.session, obj);

      return app.httpRequest()
        .get('/session')
        .expect({
          user: {
            foo: 'bar',
          },
          hello: 'egg mock session data',
        });
    });

    it('should support mock session with plain type', () => {
      const ctx = app.mockContext();
      (app as any).mockSession();
      app.mockSession('123');
      assert(ctx.session);
      assert(!(ctx as any).session.save);
      assert.equal(ctx.session, '123');
    });

    it('should mock restore', () => {
      return app.httpRequest()
        .get('/session')
        .expect({});
    });
  });

  describe('cluster process mode', () => {
    let app: MockApplication;
    before(() => {
      app = mm.cluster({
        baseDir: getFixtures('demo'),
      });
      return app.ready();
    });
    after(() => app.close());

    it('should mock session', () => {
      app.mockSession({
        user: {
          foo: 'bar',
        },
        hello: 'egg mock session data',
      });
      return app.httpRequest()
        .get('/session')
        .expect({
          user: {
            foo: 'bar',
          },
          hello: 'egg mock session data',
        });
    });

    it('should mock restore', () => {
      return app.httpRequest()
        .get('/session')
        .expect({});
    });
  });
});
