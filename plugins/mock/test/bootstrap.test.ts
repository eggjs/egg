import path from 'node:path';

import { describe, it } from 'vitest';
import coffee from 'coffee';
import { importResolve } from '@eggjs/utils';

import { getFixtures } from './helper.ts';

describe.skip('test/bootstrap.test.ts', () => {
  describe('normal app in ESM', () => {
    it('should work', async () => {
      const eggBinFile = path.join(importResolve('@eggjs/bin/package.json'), '../bin/run.js');
      await coffee
        .fork(
          eggBinFile,
          [
            'test',
            '--no-typescript',
            // error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled
            '-r',
            getFixtures('../../src/register.ts'),
          ],
          {
            cwd: getFixtures('apps/helloworld'),
          }
        )
        .debug()
        .expect('code', 0)
        .expect('stdout', /\d+ passing/)
        .end();
    });
  });
});
