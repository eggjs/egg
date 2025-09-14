import coffee from './coffee.js';
import { getFixtures } from './helper.js';

describe('test/my-egg-bin.test.ts', () => {
  const eggBin = getFixtures('my-egg-bin/bin/run.js');
  const cwd = getFixtures('test-files');

  it('should my-egg-bin test success', () => {
    return (
      coffee
        .fork(eggBin, ['test'], { cwd, env: { TESTS: 'test/**/*.test.js' } })
        // .debug()
        .expect('stdout', /should success/)
        .expect('stdout', /a.test.js/)
        .expect('stdout', /b\/b.test.js/)
        .notExpect('stdout', /a.js/)
        .expect('code', 0)
        .end()
    );
  });

  it('should my-egg-bin nsp success', async () => {
    await coffee
      .fork(eggBin, ['nsp', '-h'], { cwd })
      // .debug()
      .expect('stdout', /nsp check/)
      .expect('code', 0)
      .end();

    await coffee
      .fork(eggBin, ['nsp'], { cwd })
      // .debug()
      .expect('stdout', /run nsp check at baseDir: .+test-files, with/)
      .expect('code', 0)
      .end();

    await coffee
      .fork(eggBin, ['nsp', '--foo'], { cwd })
      // .debug()
      .expect('stdout', /run nsp check at baseDir: .+test-files, with/)
      .expect('stdout', /foo is true/)
      .expect('code', 0)
      .end();
  });

  it('should show help', async () => {
    await coffee
      .fork(eggBin, ['--help'], { cwd })
      // .debug()
      .expect('stdout', /\$ my-egg-bin \[COMMAND]/)
      .expect('stdout', /COMMANDS/)
      .expect('stdout', /test {2}Run the test/)
      .expect('stdout', /nsp {3}nsp check/)
      .expect('code', 0)
      .end();

    await coffee
      .fork(eggBin, ['dev', '-h'], { cwd })
      // .debug()
      .expect('stdout', /Run the development server with my-egg-bin/)
      .expect('stdout', /listening port, default to 7001/)
      .expect('stdout', /TypeScript compiler, like ts-node\/register/)
      .expect('code', 0)
      .end();
  });

  it('should my-egg-bin dev success', () => {
    const baseDir = getFixtures('custom-framework-app');
    return coffee
      .fork(eggBin, ['dev'], { cwd: baseDir })
      .debug()
      .expect('stdout', /yadan start/)
      .expect('stdout', /this is my-egg-bin dev/)
      .expect('code', 0)
      .end();
  });

  it('should show version 2.3.4', () => {
    return (
      coffee
        .fork(eggBin, ['--version'], { cwd })
        // .debug()
        .expect('stdout', /my-egg-bin\/2\.3\.4 /)
        .expect('code', 0)
        .end()
    );
  });
});
