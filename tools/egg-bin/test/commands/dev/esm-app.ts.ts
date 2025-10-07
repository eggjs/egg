import path from 'node:path';

import coffee from '../../coffee.ts';
import { getRootDirname, getFixtures } from '../../helper.ts';

describe('test/commands/dev/esm-app.test.ts', () => {
  it('should startCluster success on ESM', () => {
    const eggBin = path.join(getRootDirname(), 'bin/run.js');
    const cwd = getFixtures('demo-app-esm');
    const hook = path.join(cwd, 'hook.js');
    return (
      coffee
        .fork(eggBin, ['dev', '-r', hook], {
          cwd,
        })
        // .debug()
        .expect('stdout', /start hook success/)
        .expect('stdout', /'--import'/)
        .expect('stdout', /"workers":1/)
        .expect('stdout', /"baseDir":".*?demo-app-esm"/)
        .expect('stdout', /"framework":".*?aliyun-egg"/)
        .expect('stdout', /NODE_ENV: development/)
        .expect('code', 0)
        .end()
    );
  });
});
