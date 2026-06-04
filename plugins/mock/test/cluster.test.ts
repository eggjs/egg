import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

// Node.js v20: SyntaxError: Unexpected identifier 'SingleModeApplication'
describe.skipIf(process.platform === 'win32' || process.version.startsWith('v20.'))('test/cluster.test.ts', () => {
  afterEach(mm.restore);

  describe('normal', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = mm.cluster({
        baseDir: getFixtures('demo'),
        cache: false,
        coverage: false,
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

    it('should throw error when mock function not exists', () => {
      assert.throws(() => {
        app.mockNotExists();
      }, /method "mockNotExists" not exists on app/);
    });

    it('should listen on port', () => {
      app.expect('stdout', /egg started on http:\/\/127.0.0.1:\d{4,5}/);
    });
  });
});
