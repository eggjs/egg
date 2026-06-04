import { detectPort } from 'detect-port';
import { describe, it, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

// Node.js v20: SyntaxError: Unexpected identifier 'SingleModeApplication'
describe.skipIf(process.platform === 'win32' || process.version.startsWith('v20.'))(
  'test/cluster.test.ts > custom port',
  () => {
    afterEach(mm.restore);

    let app: MockApplication;
    afterAll(() => app.close());

    it('should use it', async () => {
      let port = await detectPort();
      app = mm.cluster({
        baseDir: getFixtures('demo'),
        // cache: false,
        // coverage: false,
        port,
      });
      // app.debug();
      await app.ready();

      app.expect('stdout', new RegExp(`egg started on http://127.0.0.1:${port}`));
    });
  },
);
