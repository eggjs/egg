import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll } from 'vitest';

import { getFixtures } from './helper.ts';
import mm, { type MockApplication } from '../src/index.ts';

describe('work on startMode=worker_threads', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.cluster({
      baseDir: getFixtures('demo'),
      cache: false,
      coverage: false,
      startMode: 'worker_threads',
    });
    // app.debug();
    return app.ready();
  });
  afterAll(() => app.close());

  it('should have members', async () => {
    assert.equal(app.callback(), app);
    assert.equal(app.listen(), app);
    await app.ready();
    assert(app.process);
  });

  it('should listen on port', () => {
    app.expect('stdout', /egg started on http:\/\/127.0.0.1:17\d{3}/);
  });
});
