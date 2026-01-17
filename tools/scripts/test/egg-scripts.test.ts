import path from 'node:path';

import coffee from 'coffee';
import { describe, it } from 'vite-plus/test';

describe('test/egg-scripts.test.ts', () => {
  const eggBin = path.join(import.meta.dirname, '../bin/run.js');

  it('show help', async () => {
    await coffee
      .fork(eggBin, ['--help'])
      .debug()
      .expect('stdout', /\$ eggctl \[COMMAND]/)
      .expect('code', 0)
      .end();

    await coffee
      .fork(eggBin, ['start', '-h'])
      .debug()
      .expect('stdout', /\$ eggctl start \[BASEDIR] /)
      .expect('code', 0)
      .end();

    await coffee
      .fork(eggBin, ['stop', '-h'])
      .debug()
      .expect('stdout', /\$ eggctl stop \[BASEDIR] /)
      .expect('code', 0)
      .end();
  });
});
