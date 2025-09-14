import path from 'node:path';
import coffee from '../coffee.js';
import { getFixtures, getRootDirname } from '../helper.js';

const version = Number(process.version.substring(1, 3));

describe('test/commands/test.test.ts', () => {
  const eggBin = path.join(getRootDirname(), 'bin/run.js');
  const cwd = getFixtures('test-files');

  describe('egg-bin test', () => {
    it('should success js', () => {
      return (
        coffee
          .fork(eggBin, ['test'], { cwd })
          // .debug()
          .expect('stdout', /should success/)
          .expect('stdout', /a\.test\.js/)
          .expect('stdout', /b\/b\.test\.js/)
          .notExpect('stdout', /\ba\.js/)
          .expect('code', 0)
          .end()
      );
    });

    it('should work on split test files in parallel CI jobs', () => {
      return (
        coffee
          .fork(eggBin, ['test'], {
            cwd,
            env: {
              CI_NODE_INDEX: '2',
              CI_NODE_TOTAL: '3',
            },
          })
          // .debug()
          .expect(
            'stdout',
            /# Split test files in parallel CI jobs: 3\/3, files: 1\/4/
          )
          .expect('stdout', /should success/)
          .expect('stdout', /no-timeouts\.test\.js/)
          .notExpect('stdout', /a\.test\.js/)
          .expect('stdout', /1 passing \(/)
          .expect('code', 0)
          .end()
      );
    });

    it('should success with some files', async () => {
      await coffee
        .fork(eggBin, ['test', 'test/a.test.js'], { cwd })
        // .debug()
        .expect('stdout', /should success/)
        .expect('stdout', /a\.test\.js/)
        .expect('stdout', /2 passing \(/)
        .expect('code', 0)
        .end();
      await coffee
        .fork(eggBin, ['test', 'test/a.test.js,test/ignore.test.js'], { cwd })
        // .debug()
        .expect('stdout', /should success/)
        .expect('stdout', /a\.test\.js/)
        .expect('stdout', /ignore\.test\.js/)
        .expect('code', 0)
        .end();
    });

    it('should work on auto require @eggjs/mock/register on CommonJS', () => {
      if (process.platform === 'win32') return;
      return (
        coffee
          .fork(eggBin, ['test'], {
            cwd: getFixtures('test-demo-app'),
          })
          // .debug()
          .expect('stdout', /should work/)
          .expect('stdout', /a\.test\.js/)
          .expect('code', 0)
          .end()
      );
    });

    it('should work on auto require @eggjs/mock/register on ESM', () => {
      if (process.platform === 'win32') return;
      return (
        coffee
          .fork(eggBin, ['test'], {
            cwd: getFixtures('test-demo-app-esm'),
          })
          // .debug()
          .expect('stdout', /should work/)
          .expect('stdout', /a\.test\.js/)
          .expect('code', 0)
          .end()
      );
    });

    it('should success when no changed files', () => {
      return (
        coffee
          .fork(eggBin, ['test', '-c'], { cwd })
          // .debug()
          .expect('stdout', /No changed test files/)
          .expect('code', 0)
          .end()
      );
    });

    it('should fail when baseDir not exists', () => {
      return (
        coffee
          .fork(eggBin, ['test', '--base', path.join(cwd, 'not-exists')], {
            cwd,
          })
          // .debug()
          .expect('stderr', /baseDir: .+ not exists/)
          .expect('code', 1)
          .end()
      );
    });

    it('should success on ts', async () => {
      const cwd = getFixtures('example-ts');
      await coffee
        .fork(eggBin, ['test'], { cwd })
        .debug()
        .expect('stdout', /should work/)
        .expect('stdout', /3 passing \(/)
        .expect('code', 0)
        .end();
    });

    it('should success with --mochawesome', () => {
      return (
        coffee
          .fork(eggBin, ['test', '--mochawesome'], { cwd })
          // .debug()
          .expect('stdout', /should success/)
          .expect('stdout', /a\.test\.js/)
          .expect('stdout', /b\/b\.test\.js/)
          .expect('stdout', /\[mochawesome] Report JSON saved to/)
          .expect('stdout', /mochawesome\.json/)
          .notExpect('stdout', /\ba\.js/)
          .expect('code', 0)
          .end()
      );
    });

    it('should success with --bail', () => {
      return (
        coffee
          .fork(eggBin, ['test', '--bail'], { cwd })
          // .debug()
          .expect('stdout', /should success/)
          .expect('stdout', /a\.test\.js/)
          .expect('stdout', /b\/b\.test\.js/)
          .notExpect('stdout', /\ba\.js/)
          .expect('code', 0)
          .end()
      );
    });

    it('should ignore node_modules and fixtures', () => {
      return (
        coffee
          .fork(eggBin, ['test'], { cwd: getFixtures('test-files-glob') })
          // .debug()
          .expect('stdout', /should test index/)
          .expect('stdout', /should test sub/)
          .notExpect('stdout', /no-load\.test\.js/)
          .expect('code', 0)
          .end()
      );
    });

    it('should only test files specified by TESTS', () => {
      return (
        coffee
          .fork(eggBin, ['test'], { cwd, env: { TESTS: 'test/a.test.js' } })
          // .debug()
          .expect('stdout', /should success/)
          .expect('stdout', /a\.test\.js/)
          .notExpect('stdout', /b[/\\]b.test.js/)
          .expect('code', 0)
          .end()
      );
    });

    it('should only test files specified by TESTS with multi pattern', () => {
      return (
        coffee
          .fork(eggBin, ['test'], {
            cwd,
            env: { TESTS: 'test/a.test.js,test/b/b.test.js' },
          })
          // .debug()
          .expect('stdout', /should success/)
          .expect('stdout', /a\.test\.js/)
          .expect('stdout', /b[/\\]b.test.js/)
          .expect('code', 0)
          .end()
      );
    });

    it('should only test files specified by TESTS argv', () => {
      return (
        coffee
          .fork(eggBin, ['test', 'test/a.test.js'], {
            cwd,
            env: { TESTS: 'test/**/*.test.js' },
          })
          // .debug()
          .expect('stdout', /should success/)
          .expect('stdout', /a\.test\.js/)
          .notExpect('stdout', /b[/\\]b.test.js/)
          .expect('code', 0)
          .end()
      );
    });

    it.skip('should grep pattern without error', () => {
      return (
        coffee
          .fork(
            eggBin,
            ['test', 'test/a.test.js', '--grep', 'should success'],
            {
              cwd,
            }
          )
          // .debug()
          .expect('stdout', /should success/)
          .expect('stdout', /a\.test\.js/)
          .notExpect('stdout', /should show tmp/)
          .expect('code', 0)
          .end()
      );
    });

    it('should exit when not test files', () => {
      return (
        coffee
          .fork(eggBin, ['test', 'test/**/*.nth.js'], { cwd })
          // .debug()
          .expect('stdout', /No test files found/)
          .expect('code', 0)
          .end()
      );
    });

    it('should use process.env.TEST_REPORTER', () => {
      return (
        coffee
          .fork(eggBin, ['test'], {
            cwd,
            env: {
              TESTS: 'test/**/*.test.js',
              TEST_REPORTER: 'json',
            },
          })
          // .debug()
          .expect('stdout', /"stats":/)
          .expect('stdout', /"tests":/)
          .expect('code', 0)
          .end()
      );
    });

    it('should use process.env.TEST_TIMEOUT', () => {
      return coffee
        .fork(eggBin, ['test'], {
          cwd,
          env: {
            TEST_TIMEOUT: '60000',
          },
        })
        .expect('stdout', /should success/)
        .expect('code', 0)
        .end();
    });

    it('should force exit', () => {
      // add --exit to mocha
      const cwd = getFixtures('no-exit');
      return (
        coffee
          .fork(eggBin, ['test'], { cwd })
          // .debug()
          .expect('code', 0)
          .end()
      );
    });

    it('run not test with dry-run option', () => {
      const cwd = getFixtures('mocha-test');
      return (
        coffee
          .fork(eggBin, ['test', '--timeout=12345', '--dry-run'], {
            cwd,
            env: {
              TESTS: 'test/foo.test.js',
            },
          })
          // .debug()
          .expect('stdout', /1 passing \(\d+ms\)/)
          .expect('code', 0)
          .end()
      );
    });

    it('should run test on ts-esm module', () => {
      const cwd = getFixtures('mocha-test-ts-esm');
      return coffee
        .fork(eggBin, ['test'], {
          cwd,
        })
        .debug()
        .expect('stdout', /should work/)
        .expect('stdout', /2 passing/)
        .notExpect('stderr', /ExperimentalWarning/)
        .expect('code', 0)
        .end();
    });

    it('should success js on unhandled-rejection', () => {
      if (process.env.CI) return;
      return coffee
        .fork(eggBin, ['test'], {
          cwd: getFixtures('test-unhandled-rejection'),
        })
        .debug()
        .expect('stdout', / Uncaught Error: mock error/)
        .expect('code', 1)
        .end();
    });

    it.skip('test parallel', () => {
      if (process.platform === 'win32') return;
      return coffee
        .fork(eggBin, ['test', '--parallel'], {
          cwd: getFixtures('test-demo-app'),
        })
        .debug()
        .expect('stdout', /should work/)
        .expect('stdout', /a\.test\.js/)
        .expect('code', 0)
        .end();
    });

    it('env.MOCHA_FILE should work', () => {
      return coffee
        .fork(eggBin, ['test', '--parallel'], {
          cwd: getFixtures('test-demo-app'),
          env: {
            MOCHA_FILE: getFixtures('bin/fake_mocha.js'),
          },
        })
        .debug()
        .expect('stdout', /env\.NODE_ENV: test/)
        .expect('stdout', /env\.AUTO_AGENT: true/)
        .expect('stdout', /env\.ENABLE_MOCHA_PARALLEL: true/)
        .expect('code', 0)
        .end();
    });
  });

  describe('run test/.setup.js|ts first', () => {
    it('should auto require test/.setup.js', () => {
      return (
        coffee
          .fork(eggBin, ['test', '--no-typescript'], {
            cwd: getFixtures('setup-js'),
            env: {
              TESTS: 'test/a.test.js',
            },
          })
          // .debug()
          .expect('stdout', /this is a before function/)
          .expect('stdout', /hello egg/)
          .expect('stdout', /is end!/)
          .expect('code', 0)
          .end()
      );
    });

    it('should auto require test/.setup.ts', () => {
      return (
        coffee
          .fork(eggBin, ['test', '--typescript'], {
            cwd: getFixtures('setup-ts'),
            env: {
              TESTS: 'test/a.test.ts',
            },
          })
          // .debug()
          .expect('stdout', /this is a before function/)
          .expect('stdout', /hello egg/)
          .expect('stdout', /is end!/)
          .expect('code', 0)
          .end()
      );
    });
  });

  describe('no-timeouts', () => {
    it('should timeout', () => {
      return (
        coffee
          .fork(eggBin, ['test'], {
            cwd,
            env: {
              TEST_TIMEOUT: '5000',
              TESTS: 'test/**/no-timeouts.test.js',
            },
          })
          // .debug()
          .expect('stdout', /timeout: 5000/)
          .expect('code', 0)
          .end()
      );
    });

    it('should support --no-timeout', () => {
      return (
        coffee
          .fork(eggBin, ['test', '--no-timeout'], {
            cwd,
            env: {
              TEST_TIMEOUT: '5000',
              TESTS: 'test/**/no-timeouts.test.js',
            },
          })
          // .debug()
          .expect('stdout', /timeout: 0/)
          .expect('code', 0)
          .end()
      );
    });

    it('should no-timeout at inspect mode', () => {
      return (
        coffee
          .fork(eggBin, ['test', '--inspect'], {
            cwd,
            env: {
              TESTS: 'test/**/no-timeouts.test.js',
            },
          })
          // .debug()
          .expect('stdout', /timeout: 0/)
          .expect('code', 0)
          .end()
      );
    });

    it('should no-timeout at WebStorm debug mode', () => {
      return (
        coffee
          .fork(eggBin, ['test'], {
            cwd,
            env: {
              TESTS: 'test/**/no-timeouts.test.js',
              JB_DEBUG_FILE: eggBin,
            },
          })
          // .debug()
          .expect('stdout', /timeout: 0/)
          .expect('code', 0)
          .end()
      );
    });

    it('should support egg.revert', () => {
      if (version !== 20) return;
      return coffee
        .fork(eggBin, ['test'], {
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
  });

  describe('work on special path', () => {
    it('should work with space in path', () => {
      return (
        coffee
          .fork(eggBin, ['test'], {
            cwd: getFixtures('test path with space/test-files'),
          })
          // .debug()
          .expect('stdout', /should success/)
          .expect('code', 0)
          .end()
      );
    });
  });
});
