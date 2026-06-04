import { describe, it, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

// Node.js v20: SyntaxError: Unexpected identifier 'SingleModeApplication'
describe.skipIf(process.platform === 'win32' || process.version.startsWith('v20.'))(
  'test/cluster.test.ts > cluster with eggPath',
  () => {
    afterEach(mm.restore);

    let app: MockApplication;
    afterAll(() => app.close());

    it('should get eggPath', async () => {
      app = mm.cluster({
        baseDir: getFixtures('demo'),
        customEgg: getFixtures('chair'),
        eggPath: '/path/to/eggPath',
        // cache: false,
        // coverage: false,
      } as any);
      await app
        .debug()
        .expect('stdout', /\/path\/to\/eggPath/)
        .end();
    });
  },
);
