import { describe, it, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

// Node.js v20: SyntaxError: Unexpected identifier 'SingleModeApplication'
describe.skipIf(process.platform === 'win32' || process.version.startsWith('v20.'))(
  'test/cluster.test.ts > cluster with workers',
  () => {
    afterEach(mm.restore);

    let app: MockApplication;
    afterAll(() => app.close());

    it('should get 2 workers', async () => {
      app = mm.cluster({
        baseDir: getFixtures('demo'),
        customEgg: getFixtures('chair'),
        workers: 2,
        // cache: false,
        // coverage: false,
      });
      app.debug();
      await app
        .expect('stdout', /app_worker#1:/)
        .expect('stdout', /app_worker#2:/)
        .end();
    });
  },
);
