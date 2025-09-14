import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import _cpy from 'cpy';
import { runScript } from 'runscript';
import coffee from './coffee.js';
import { getRootDirname, getFixtures } from './helper.js';

async function cpy(src: string, target: string) {
  if (fs.cp) {
    await fs.cp(src, target, { force: true, recursive: true });
    return;
  }
  await _cpy(src, target);
}

describe('test/ts.test.ts', () => {
  const eggBin = path.join(getRootDirname(), 'bin/run.js');
  let cwd: string;

  it('should support ts', () => {
    cwd = getFixtures('ts');
    return (
      coffee
        .fork(eggBin, ['dev'], { cwd, env: { NODE_ENV: 'development' } })
        // .debug()
        .expect('stdout', /options.typescript=true/)
        .expect('stdout', /started/)
        .expect('code', 0)
        .end()
    );
  });

  it('should support ts test', () => {
    cwd = getFixtures('ts');
    return (
      coffee
        .fork(eggBin, ['test', '--typescript'], {
          cwd,
          env: { NODE_ENV: 'development' },
        })
        // .debug()
        .expect('stdout', /'egg from ts' == 'wrong assert ts'/)
        .expect('stdout', /AssertionError/)
        .expect('code', 1)
        .end()
    );
  });

  describe('real application', () => {
    before(() => {
      cwd = getFixtures('example-ts');
    });

    it('should start app', () => {
      return coffee
        .fork(eggBin, ['dev'], { cwd })
        .debug()
        .expect('stdout', /hi, egg, 12345/)
        .expect('stdout', /ts env: true/)
        .expect('stdout', /started/)
        .expect('code', 0)
        .end();
    });

    it('should test app', () => {
      return (
        coffee
          .fork(eggBin, ['test'], { cwd })
          // .debug()
          .expect('stdout', /hi, egg, 123456/)
          .expect('stdout', /ts env: true/)
          .expect('stdout', /should work/)
          .expect('code', 0)
          .end()
      );
    });

    it('should cov app', () => {
      return (
        coffee
          .fork(eggBin, ['cov'], { cwd })
          // .debug()
          .expect('stdout', /hi, egg, 123456/)
          .expect('stdout', /ts env: true/)
          .expect('stdout', /should work/)
          .expect('code', 0)
          .end()
      );
    });

    it('should cov app in cluster mod', () => {
      // TODO(@fengmk2): not work on Node.js 22
      // https://github.com/eggjs/bin/actions/runs/13308042479/job/37164115998
      if (process.version.startsWith('v22.')) {
        return;
      }
      cwd = getFixtures('example-ts-cluster');
      return coffee
        .fork(eggBin, ['cov'], { cwd })
        .debug()
        .expect('stdout', /Statements/)
        .expect('code', 0)
        .end();
    });
  });

  describe('error stacks', () => {
    before(() => {
      cwd = getFixtures('example-ts-error-stack');
    });

    it('should correct error stack line number in starting app', () => {
      return coffee
        .fork(eggBin, ['dev'], { cwd, env: { THROW_ERROR: 'true' } })
        .debug()
        .expect('stderr', /Error: throw error/)
        .expect('stderr', /at \w+ \(.+app\.ts:7:11\)/)
        .end();
    });

    it('should correct error stack line number in testing app', () => {
      return (
        coffee
          .fork(eggBin, ['test'], { cwd })
          // .debug()
          .expect('stdout', /error/)
          .expect('stdout', /2 failing/)
          .expect('stdout', /test[/\\]index\.test\.ts:\d+:\d+\)/)
          .expect('stdout', /AssertionError \[ERR_ASSERTION]: '111' == '222'/)
          .expect('code', 1)
          .end()
      );
    });

    it('should correct error stack line number in testing app with tscompiler=esbuild-register', () => {
      return (
        coffee
          .fork(eggBin, ['test', '--tscompiler=esbuild-register'], { cwd })
          // .debug()
          .expect('stdout', /error/)
          .expect('stdout', /2 failing/)
          .expect('stdout', /test[/\\]index\.test\.ts:\d+:\d+\)/)
          .expect('stdout', /AssertionError \[ERR_ASSERTION]: '111' == '222'/)
          .expect('code', 1)
          .end()
      );
    });

    it('should correct error stack line number in testing app with tscompiler=@swc-node/register', () => {
      return (
        coffee
          .fork(eggBin, ['test', '--tscompiler=@swc-node/register'], { cwd })
          // .debug()
          .expect('stdout', /error/)
          .expect('stdout', /2 failing/)
          .expect('stdout', /test[/\\]index\.test\.ts:\d+:\d+\)/)
          .expect('stdout', /AssertionError \[ERR_ASSERTION]: '111' == '222'/)
          .expect('code', 1)
          .end()
      );
    });

    it('should support env.TS_COMPILER', () => {
      return (
        coffee
          .fork(eggBin, ['test'], {
            cwd,
            env: {
              TS_COMPILER: 'esbuild-register',
              NODE_DEBUG: 'egg-bin*',
            },
          })
          // .debug()
          .expect('stdout', /error/)
          .expect('stdout', /2 failing/)
          .expect('stdout', /test[/\\]index\.test\.ts:\d+:\d+\)/)
          .expect('stdout', /AssertionError \[ERR_ASSERTION]: '111' == '222'/)
          .expect('code', 1)
          .end()
      );
    });

    it('should correct error stack line number in covering app', () => {
      return (
        coffee
          .fork(eggBin, ['test'], { cwd })
          // .debug()
          .expect('stdout', /error/)
          .expect('stdout', /2 failing/)
          .expect('stdout', /test[/\\]index\.test\.ts:\d+:\d+\)/)
          .expect('stdout', /AssertionError \[ERR_ASSERTION]: '111' == '222'/)
          .end()
      );
    });

    it('should correct error stack line number in mixed app', () => {
      const cwd = getFixtures('example-ts-error-stack-mixed');
      return (
        coffee
          .fork(eggBin, ['test', '--ts', 'false'], { cwd })
          // .debug()
          .expect('stdout', /error/)
          .expect('stdout', /2 failing/)
          .expect('stdout', /test[/\\]index\.test\.js:\d+:\d+\)/)
          .expect('stdout', /AssertionError \[ERR_ASSERTION]: '111' == '222'/)
          .end()
      );
    });
  });

  describe('egg.typescript = true', () => {
    const tempNodeModules = getFixtures('node_modules');
    const tempPackageJson = getFixtures('package.json');
    afterEach(async () => {
      await fs.rm(tempNodeModules, { force: true, recursive: true });
      await fs.rm(tempPackageJson, { force: true, recursive: true });
    });

    before(() => {
      cwd = getFixtures('example-ts-pkg');
    });

    it('should start app', () => {
      return (
        coffee
          .fork(eggBin, ['dev'], { cwd })
          // .debug()
          .expect('stdout', /hi, egg, 12345/)
          .expect('stdout', /ts env: true/)
          .expect('stdout', /started/)
          .expect('code', 0)
          .end()
      );
    });

    it('should fail start app with --no-typescript', () => {
      return (
        coffee
          .fork(eggBin, ['dev', '--no-typescript'], { cwd })
          // .debug()
          .expect('stdout', /agent.options.typescript = false/)
          .expect('stdout', /started/)
          .expect('code', 0)
          .end()
      );
    });

    it('should start app with flags in app without eggInfo', async () => {
      const cwd = getFixtures('example-ts-simple');
      await coffee
        .fork(eggBin, ['dev'], { cwd })
        // .debug()
        .expect('stdout', /started/)
        .expect('code', 0)
        .end();

      await coffee
        .fork(eggBin, ['dev', '--tsc=esbuild-register'], { cwd })
        // .debug()
        .expect('stdout', /started/)
        .expect('code', 0)
        .end();
    });

    it('should load custom ts compiler', async () => {
      if (process.platform === 'win32') return;
      const cwd = getFixtures('example-ts-custom-compiler');

      // install custom ts-node
      await fs.rm(path.join(cwd, 'node_modules'), {
        force: true,
        recursive: true,
      });
      if (process.env.CI) {
        // don't use npmmirror.com on CI
        await runScript('npminstall', { cwd });
      } else {
        await runScript('npminstall -c', { cwd });
      }

      // copy egg to node_modules
      await cpy(
        getFixtures('example-ts-cluster/node_modules/egg'),
        path.join(cwd, './node_modules/egg')
      );

      const { stderr, code } = await coffee
        .fork(eggBin, ['dev', '--tsc', 'ts-node/register'], {
          cwd,
          env: {
            NODE_DEBUG: '@eggjs/bin*',
          },
        })
        .debug()
        .end();
      // @EGGJS/BIN/BASECOMMAND 15959: set NODE_OPTIONS: '--require /Users/fengmk2/git/github.com/eggjs/bin/node_modules/.store/ts-node@10.9.2/node_modules/ts-node/register/index.js'
      // assert.match(stderr, /ts-node@10\.\d+\.\d+/);
      assert.match(stderr, /ts-node/);
      assert.equal(code, 0);
    });

    it('should load custom ts compiler with tscompiler args', async () => {
      if (process.platform === 'win32') return;
      const cwd = getFixtures('example-ts-custom-compiler-2');

      // install custom ts-node
      await fs.rm(path.join(cwd, 'node_modules'), {
        force: true,
        recursive: true,
      });
      if (process.env.CI) {
        // don't use npmmirror.com on CI
        await runScript('npminstall ts-node@10.9.2 --no-save', { cwd });
      } else {
        await runScript('npminstall -c ts-node@10.9.2 --no-save', { cwd });
      }

      // copy egg to node_modules
      await cpy(
        getFixtures('example-ts-cluster/node_modules/egg'),
        path.join(cwd, './node_modules/egg')
      );

      const { stderr, code } = await coffee
        .fork(eggBin, ['dev', '--tscompiler=ts-node/register'], {
          cwd,
          env: {
            NODE_DEBUG: '@eggjs/bin*',
          },
        })
        .debug()
        .end();
      // assert.match(stderr, /ts-node@10\.9\.2/);
      assert.match(stderr, /ts-node/);
      assert.equal(code, 0);
    });

    it('should not load custom ts compiler without tscompiler args', async () => {
      const cwd = getFixtures('example-ts-custom-compiler-2');

      // install custom ts-node
      await fs.rm(path.join(cwd, 'node_modules'), {
        force: true,
        recursive: true,
      });
      if (process.env.CI) {
        // don't use npmmirror.com on CI
        await runScript('npx npminstall ts-node@10.9.2 --no-save', { cwd });
      } else {
        await runScript('npx npminstall -c ts-node@10.9.2 --no-save', { cwd });
      }

      // copy egg to node_modules
      await cpy(
        getFixtures('example-ts-cluster/node_modules/egg'),
        path.join(cwd, './node_modules/egg')
      );

      const { stderr, code } = await coffee
        .fork(eggBin, ['dev'], {
          cwd,
          env: {
            NODE_DEBUG: '@eggjs/bin*',
          },
        })
        .debug()
        .end();
      assert.doesNotMatch(stderr, /ts-node@10\.9\.2/);
      assert.equal(code, 0);
    });

    it('should start app with other tscompiler without error', () => {
      return (
        coffee
          .fork(eggBin, ['dev', '--tscompiler=esbuild-register'], {
            cwd: getFixtures('example-ts'),
          })
          // .debug()
          .expect('stdout', /agent.options.typescript = true/)
          .expect('stdout', /agent.options.tscompiler =/)
          .expect('stdout', /esbuild-register/)
          .expect('stdout', /started/)
          .expect('code', 0)
          .end()
      );
    });

    it('should skip ts-node on env.EGG_TYPESCRIPT="false"', () => {
      return (
        coffee
          .fork(eggBin, ['dev', '--tscompiler=esbuild-register'], {
            cwd: getFixtures('example-ts'),
            env: {
              EGG_TYPESCRIPT: 'false',
            },
          })
          // .debug()
          .expect('stdout', /agent.options.typescript = false/)
          .expect('stdout', /agent.options.tscompiler =/)
          .expect('stdout', /esbuild-register/)
          .expect('stdout', /started/)
          .expect('code', 0)
          .end()
      );
    });

    it('should enable ts-node on env.EGG_TYPESCRIPT="true"', () => {
      return (
        coffee
          .fork(eggBin, ['dev', '--tscompiler=esbuild-register'], {
            cwd: getFixtures('example-ts'),
            env: {
              EGG_TYPESCRIPT: 'true',
            },
          })
          // .debug()
          .expect('stdout', /agent.options.typescript = true/)
          .expect('stdout', /agent.options.tscompiler =/)
          .expect('stdout', /esbuild-register/)
          .expect('stdout', /started/)
          .expect('code', 0)
          .end()
      );
    });

    it('should start app with other tscompiler in package.json without error', () => {
      return (
        coffee
          .fork(eggBin, ['dev'], {
            cwd: getFixtures('example-ts-pkg'),
          })
          // .debug()
          .expect('stdout', /agent.options.typescript = true/)
          .expect('stdout', /agent.options.tscompiler =/)
          .expect('stdout', /esbuild-register/)
          .expect('stdout', /started/)
          .expect('code', 0)
          .end()
      );
    });

    it('should test app', () => {
      return (
        coffee
          .fork(eggBin, ['test'], { cwd })
          // .debug()
          .expect('stdout', /hi, egg, 123456/)
          .expect('stdout', /ts env: true/)
          .expect('code', 0)
          .end()
      );
    });

    it('should test with custom ts compiler without error', async () => {
      const cwd = getFixtures('example-ts-custom-compiler');

      // install custom ts-node
      await fs.rm(path.join(cwd, 'node_modules'), {
        force: true,
        recursive: true,
      });
      if (process.env.CI) {
        // don't use npmmirror.com on CI
        await runScript('npminstall', { cwd });
      } else {
        await runScript('npminstall -c', { cwd });
      }

      // copy egg to node_modules
      await cpy(
        getFixtures('example-ts-cluster/node_modules/egg'),
        path.join(cwd, './node_modules/egg')
      );

      const { stdout, code } = await coffee
        .fork(eggBin, ['test', '--tsc', 'ts-node/register'], {
          cwd,
          env: {
            NODE_DEBUG: '@eggjs/bin*',
          },
        })
        .debug()
        .end();
      assert.match(stdout, /ts-node/);
      assert.equal(code, 0);
    });

    it('should cov app', () => {
      return (
        coffee
          .fork(eggBin, ['cov'], { cwd })
          // .debug()
          .expect('stdout', /hi, egg, 123456/)
          .expect('stdout', /ts env: true/)
          .expect('code', 0)
          .end()
      );
    });
  });
});
