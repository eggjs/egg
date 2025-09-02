// import { strict as assert } from 'node:assert';
// import fs from 'node:fs';
// import { scheduler } from 'node:timers/promises';

import { describe, it, beforeAll, afterAll } from 'vitest';

import mm, { MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

// afterEach(mm.restore);

describe('cluster mock restore', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.cluster({
      baseDir: getFixtures('demo'),
      coverage: false,
    });
    return app.ready();
  });
  afterAll(() => app.close());

  it('should work', async () => {
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

    mm.restore();
    await app.httpRequest().get('/session').expect({});
  });
});

describe.skip('handle uncaughtException', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.cluster({
      baseDir: getFixtures('apps/app-throw'),
      coverage: false,
    });
    return app.ready();
  });
  afterAll(() => app.close());

  it('should handle uncaughtException and log it', async () => {
    await app.httpRequest().get('/throw').expect('foo').expect(200);

    // await scheduler.wait(1100);
    // const logFile = getFixtures('apps/app-throw/logs/app-throw/common-error.log');
    // const body = fs.readFileSync(logFile, 'utf8');
    // assert(body.includes('ReferenceError: a is not defined (uncaughtException throw'));
  });
});
