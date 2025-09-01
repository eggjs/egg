import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { scheduler } from 'node:timers/promises';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/mock_cluster_restore.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = mm.cluster({
      baseDir: 'demo',
      coverage: false,
    });
    return app.ready();
  });
  after(() => app.close());

  afterEach(mm.restore);

  it('should mock cluster restore work', async () => {
    app.mockSession({
      user: {
        foo: 'bar',
      },
      hello: 'egg mock session data',
    });
    await app.httpRequest()
      .get('/session')
      .expect({
        user: {
          foo: 'bar',
        },
        hello: 'egg mock session data',
      });

    mm.restore();
    await app.httpRequest()
      .get('/session')
      .expect({});
  });

  describe('handle uncaughtException', () => {
    let app: MockApplication;
    before(() => {
      app = mm.cluster({
        baseDir: 'apps/app-throw',
        coverage: false,
      });
      return app.ready();
    });
    after(() => app.close());

    it('should handle uncaughtException and log it', async () => {
      await app.httpRequest()
        .get('/throw')
        .expect('foo')
        .expect(200);

      await scheduler.wait(1100);
      const logFile = getFixtures('apps/app-throw/logs/app-throw/common-error.log');
      const body = fs.readFileSync(logFile, 'utf8');
      assert(body.includes('ReferenceError: a is not defined (uncaughtException throw'));
    });
  });
});
