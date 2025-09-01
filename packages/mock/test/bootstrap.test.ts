import path from 'node:path';
import coffee from 'coffee';
import { importResolve } from '@eggjs/utils';
import { getFixtures } from './helper.js';

describe('test/bootstrap.test.ts', () => {
  describe('normal app in ESM', () => {
    it('should work', async () => {
      const eggBinFile = path.join(importResolve('@eggjs/bin/package.json'), '../bin/run.js');
      await coffee.fork(eggBinFile, [
        'test',
        '--no-typescript',
        '-r', getFixtures('../../dist/esm/register.js'),
      ], {
        cwd: getFixtures('apps/helloworld'),
      })
        .debug()
        .expect('code', 0)
        .expect('stdout', /\d+ passing/)
        .end();
    });
  });
});
