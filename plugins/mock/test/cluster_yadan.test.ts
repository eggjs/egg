import { describe, it, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

// Node.js v20: SyntaxError: Unexpected identifier 'SingleModeApplication'
describe.skipIf(process.platform === 'win32' || process.version.startsWith('v20.'))(
  'test/cluster.test.ts > cluster with egg.framework=yadan',
  () => {
    afterEach(mm.restore);

    let app: MockApplication;
    afterAll(() => app.close());

    it('should pass execArgv', async () => {
      app = mm.cluster({
        baseDir: getFixtures('yadan_app'),
        workers: 1,
        cache: false,
        coverage: false,
      });
      await app.expect('stdout', /app_worker#1:/).end();
    });
  },
);
