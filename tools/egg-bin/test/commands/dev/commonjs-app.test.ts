import path from 'node:path';

import { describe, it } from 'vitest';

import coffee from '../../coffee.ts';
import { getRootDirname, getFixtures } from '../../helper.ts';

describe('test/commands/dev/commonjs-app.test.ts', () => {
  it('should startCluster success on CommonJS', () => {
    const eggBin = path.join(getRootDirname(), 'bin/run.js');
    const cwd = getFixtures('demo-app-commonjs');

    return (
      coffee
        .fork(eggBin, ['dev'], {
          cwd,
          // env: { NODE_DEBUG: 'egg-bin*' },
        })
        // .debug()
        .expect('stdout', /"workers":1/)
        .expect('stdout', /"baseDir":".*?demo-app-commonjs"/)
        .expect('stdout', /"framework":".*?aliyun-egg"/)
        .expect('stdout', /NODE_ENV: development/)
        .expect('code', 0)
        .end()
    );
  });
});
