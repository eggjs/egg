import path from 'node:path';
import net, { Server } from 'node:net';
import { detect } from 'detect-port';
import { mm } from '@eggjs/mock';
import { importResolve } from '@eggjs/utils';
import coffee from '../coffee.js';
import { getRootDirname, getFixtures } from '../helper.js';

const version = Number(process.version.substring(1, 3));

describe('test/commands/dev.test.ts', () => {
  const eggBin = path.join(getRootDirname(), 'bin/run.js');
  const cwd = getFixtures('demo-app');

  it('should startCluster success on CommonJS', () => {
    return (
      coffee
        .fork(eggBin, ['dev'], {
          cwd,
          // env: { NODE_DEBUG: 'egg-bin*' },
        })
        // .debug()
        .expect('stdout', /"workers":1/)
        .expect('stdout', /"baseDir":".*?demo-app"/)
        .expect('stdout', /"framework":".*?aliyun-egg"/)
        .expect('stdout', /NODE_ENV: development/)
        .expect('code', 0)
        .end()
    );
  });

  it('should startCluster success on ESM', () => {
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

  it('should dev start with custom NODE_ENV', () => {
    return coffee
      .fork(eggBin, ['dev'], { cwd, env: { NODE_ENV: 'prod' } })
      .debug()
      .expect('stdout', /"workers":1/)
      .expect('stdout', /"baseDir":".*?demo-app"/)
      .expect('stdout', /"framework":".*?aliyun-egg"/)
      .expect('stdout', /NODE_ENV: prod/)
      .expect('code', 0)
      .end();
  });

  it.skip('should dev start work with declarations = true', () => {
    const cwd = getFixtures('example-declarations');
    return coffee
      .fork(eggBin, ['dev'], { cwd })
      .debug()
      .expect('stdout', /"workers":1/)
      .expect('stdout', /"baseDir":".*?example-declarations"/)
      .expect('stdout', /"framework":".*?egg"/)
      .expect('stdout', /\[egg-ts-helper\] create typings/)
      .expect('code', 0)
      .end();
  });

  it('should startCluster with --port', () => {
    return (
      coffee
        .fork(eggBin, ['dev', '--port', '6001'], { cwd })
        // .debug()
        .expect('stdout', /"workers":1/)
        .expect('stdout', /"port":6001/)
        .expect('stdout', /"baseDir":".*?demo-app"/)
        .expect('stdout', /"framework":".*?aliyun-egg"/)
        .expect('code', 0)
        .end()
    );
  });

  it('should startCluster with --sticky', () => {
    return (
      coffee
        .fork(eggBin, ['dev', '--port', '6001', '--sticky'], { cwd })
        // .debug()
        .expect('stdout', /"workers":1/)
        .expect('stdout', /"port":6001/)
        .expect('stdout', /"sticky":true/)
        .expect('stdout', /"baseDir":".*?demo-app"/)
        .expect('stdout', /"framework":".*?aliyun-egg"/)
        .expect('code', 0)
        .end()
    );
  });

  it('should startCluster with -p', () => {
    return (
      coffee
        .fork(eggBin, ['dev', '-p', '6001'], { cwd })
        // .debug()
        .expect('stdout', /"workers":1/)
        .expect('stdout', /"port":6001/)
        .expect('stdout', /"baseDir":".*?demo-app"/)
        .expect('stdout', /"framework":".*?aliyun-egg"/)
        .expect('code', 0)
        .end()
    );
  });

  it('should startCluster with --cluster=2', () => {
    return (
      coffee
        .fork(eggBin, ['dev', '--cluster=2'], { cwd })
        // .debug()
        .expect('stdout', /"workers":2/)
        .expect('stdout', /"baseDir":".*?demo-app"/)
        .expect('stdout', /"framework":".*?aliyun-egg"/)
        .notExpect('stdout', /"cluster"/)
        .expect('code', 0)
        .end()
    );
  });

  it('should startCluster with --workers=2', () => {
    return (
      coffee
        .fork(eggBin, ['dev', '--workers=2'], { cwd })
        // .debug()
        .expect('stdout', /"workers":2/)
        .expect('stdout', /"baseDir":".*?demo-app"/)
        .expect('stdout', /"framework":".*?aliyun-egg"/)
        .notExpect('stdout', /"cluster"/)
        .expect('code', 0)
        .end()
    );
  });

  it('should startCluster with --baseDir=root', () => {
    return (
      coffee
        .fork(eggBin, ['dev', `--baseDir=${cwd}`])
        // .debug()
        .expect('stdout', /"workers":1/)
        .expect('stdout', /"baseDir":".*?demo-app"/)
        .expect('stdout', /"framework":".*?aliyun-egg"/)
        .expect('code', 0)
        .end()
    );
  });

  it('should startCluster with custom yadan framework', () => {
    const baseDir = getFixtures('custom-framework-app');
    return (
      coffee
        .fork(eggBin, ['dev'], { cwd: baseDir })
        // .debug()
        .expect('stdout', /yadan start:/)
        .expect('stdout', /"workers":1/)
        .expect('stdout', /"baseDir":".*?custom-framework-app"/)
        .expect('stdout', /"framework":".*?yadan"/)
        .expect('code', 0)
        .end()
    );
  });

  it('should startCluster with execArgv --inspect', () => {
    return (
      coffee
        .fork(eggBin, ['dev', '--inspect'], { cwd })
        // .debug()
        .expect('stderr', /Debugger listening on ws:\/\/127.0.0.1:\d+/)
        .expect('code', 0)
        .end()
    );
  });

  it('should support --require', () => {
    const script = getFixtures('require-script.cjs');
    return coffee
      .fork(eggBin, ['dev', '--require', script], { cwd })
      .debug()
      .expect('stdout', /hey, you require me by --require/)
      .expect('code', 0)
      .end();
  });

  it('should support --import', () => {
    const cwd = getFixtures('demo-app-esm');
    const script = getFixtures('require-script.mjs');
    return coffee
      .fork(eggBin, ['dev', '--import', script], { cwd })
      .debug()
      .expect('stdout', /hey, you require me by --import/)
      .expect('code', 0)
      .end();
  });

  it('should support egg.require', () => {
    return coffee
      .fork(eggBin, ['dev'], {
        cwd: getFixtures('egg-require'),
      })
      .debug()
      .expect('stdout', /hey, you require me by --require/)
      .expect('code', 0)
      .end();
  });

  describe('auto detect available port', () => {
    let server: Server;
    let serverPort: number;
    before(async () => {
      serverPort = await detect(7001);
      server = net.createServer();
      await new Promise<void>(resolve => {
        server.listen(serverPort, resolve);
      });
    });

    after(() => server.close());

    it('should auto detect available port', () => {
      return (
        coffee
          .fork(eggBin, ['dev'], {
            cwd,
            env: { EGG_BIN_DEFAULT_PORT: String(serverPort) },
          })
          // .debug()
          .expect(
            'stderr',
            /\[@eggjs\/bin] server port \d+ is unavailable, now using port \d+/
          )
          .expect('code', 0)
          .end()
      );
    });
  });

  describe('obtain the port from config.*.js', () => {
    const cwd = getFixtures('example-port');
    it.skip('should obtain the port from config.default.js', () => {
      const eggFramework = path.dirname(importResolve('egg/package.json'));
      return coffee
        .fork(eggBin, ['dev', '--framework', eggFramework], {
          cwd,
        })
        .debug()
        .expect('stdout', /"port":6001/)
        .expect('code', 0)
        .end();
    });
  });

  it('should support egg.revert', () => {
    if (version !== 20) return;
    mm(process.env, 'NODE_ENV', 'development');
    return coffee
      .fork(eggBin, ['dev'], {
        cwd: getFixtures('egg-revert'),
      })
      .debug()
      .expect(
        'stdout',
        /SECURITY WARNING: Reverting CVE-2023-46809: Marvin attack on PKCS#1 padding/
      )
      .expect('code', 0)
      .end();
  });

  describe('work on special path', () => {
    it('should work with space in path', () => {
      return (
        coffee
          .fork(eggBin, ['dev'], {
            cwd: getFixtures('test path with space/example-app'),
          })
          // .debug()
          .expect('stdout', /Hello, world!/)
          .expect('code', 0)
          .end()
      );
    });

    it('should support declarations with space in path', () => {
      return (
        coffee
          .fork(eggBin, ['dev'], {
            cwd: getFixtures('test path with space/example-declarations'),
          })
          // .debug()
          .expect('stdout', /Hi, I am Egg TS helper!/)
          .expect('code', 0)
          .end()
      );
    });

    it('should support egg.require with space in path', () => {
      return (
        coffee
          .fork(eggBin, ['dev'], {
            cwd: getFixtures('test path with space/example-egg-require'),
          })
          // .debug()
          .expect('stdout', /hey, you require me by --require/)
          .expect('code', 0)
          .end()
      );
    });

    it('should support --require with space in path', () => {
      return (
        coffee
          .fork(
            eggBin,
            [
              'dev',
              '--require',
              getFixtures('test path with space/require script.cjs'),
            ],
            {
              cwd: getFixtures('test path with space/example-require-script'),
            }
          )
          // .debug()
          .expect('stdout', /hey, you require me by --require/)
          .expect('code', 0)
          .end()
      );
    });

    it('should support --import with space in path', () => {
      return (
        coffee
          .fork(
            eggBin,
            [
              'dev',
              '--import',
              getFixtures('test path with space/require script.mjs'),
            ],
            {
              cwd: getFixtures('test path with space/example-import-script'),
            }
          )
          // .debug()
          .expect('stdout', /hey, you require me by --import/)
          .expect('code', 0)
          .end()
      );
    });
  });
});
