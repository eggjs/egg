import { strict as assert } from 'node:assert';

import { describe, it, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

// Node.js v20: SyntaxError: Unexpected identifier 'SingleModeApplication'
describe
  .skipIf(process.platform === 'win32' || process.version.startsWith('v20.'))
  .sequential('test/cluster.test.ts > cluster with cache', () => {
    afterEach(mm.restore);

    let app1: MockApplication;
    let app2: MockApplication;
    afterEach(() => {
      const promises: Promise<void>[] = [];
      app1 && promises.push(app1.close());
      app2 && promises.push(app2.close());
      return Promise.all(promises);
    });
    afterAll(() => mm.restore());

    it('should return cached cluster app', async () => {
      app1 = mm.cluster({
        baseDir: getFixtures('demo'),
        // coverage: false,
      });
      await app1.ready();

      app2 = mm.cluster({
        baseDir: getFixtures('demo'),
        // coverage: false,
      });
      await app2.ready();

      assert.equal(app1, app2);
    });

    it('should return new app if cached app has been closed', async () => {
      app1 = mm.cluster({
        baseDir: getFixtures('demo'),
        // coverage: false,
      });
      await app1.ready();
      await app1.close();

      app2 = mm.cluster({
        baseDir: getFixtures('demo'),
        // coverage: false,
      });
      await app2.ready();

      assert.notEqual(app2, app1);
    });
  });
