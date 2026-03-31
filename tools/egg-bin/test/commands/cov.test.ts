import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import { mock } from '@eggjs/mock';
import assertFile from 'assert-file';
import { describe, it } from 'vitest';

import coffee from '../coffee.ts';
import { getFixtures, getRootDirname } from '../helper.ts';

const version = Number(process.version.substring(1, 3));

describe('test/commands/cov.test.ts', () => {
  const eggBin = path.join(getRootDirname(), 'bin/run.js');
  const cwd = getFixtures('test-files-cov');

  async function assertCoverage(baseDir: string) {
    assertFile(path.join(baseDir, 'coverage/coverage-final.json'));
    assertFile(path.join(baseDir, 'coverage/coverage-summary.json'));
    assertFile(path.join(baseDir, 'coverage/lcov-report/index.html'));
    assertFile(path.join(baseDir, 'coverage/lcov.info'));
    assertFile(path.join(baseDir, 'coverage/cobertura-coverage.xml'));
  }

  describe('egg-bin cov', () => {
    it('should success on js with --javascript', async () => {
      await coffee
        .fork(eggBin, ['cov', '--javascript'], {
          cwd,
          env: { TESTS: 'test/a.test.js,test/b/b.test.js,test/ignore.test.js' },
        })
        .debug()
        .expect('stdout', /a\.test\.js/)
        .expect('stdout', /b[/|\\]b\.test\.js/)
        .notExpect('stdout', /\ba\.js/)
        .expect('stdout', /Statements {3}:/)
        .expect('code', 0)
        .end();
      await assertCoverage(cwd);
      const lcov = await fs.readFile(path.join(cwd, 'coverage/lcov.info'), 'utf8');
      assert.match(lcov, /ignore[/|\\]a.js/);
    });

    it('should success on js with --ts=false', async () => {
      await coffee
        .fork(eggBin, ['cov', '--ts=false'], {
          cwd,
          env: { TESTS: 'test/a.test.js,test/b/b.test.js,test/ignore.test.js' },
        })
        // .debug()
        .expect('stdout', /a\.test\.js/)
        .expect('stdout', /b[/|\\]b\.test\.js/)
        .notExpect('stdout', /\ba\.js/)
        .expect('stdout', /Statements {3}:/)
        .expect('code', 0)
        .end();
      await assertCoverage(cwd);
      const lcov = await fs.readFile(path.join(cwd, 'coverage/lcov.info'), 'utf8');
      assert.match(lcov, /ignore[/|\\]a.js/);
    });

    it('should success on ts', async () => {
      const cwd = getFixtures('example-ts-cov');
      await coffee
        .fork(eggBin, ['cov'], { cwd })
        // .debug()
        .expect('stdout', /index\.test\.ts/)
        .expect('stdout', /Tests.*passed/)
        .expect('stdout', /Statements\s+: 100% \( \d+\/\d+ \)/)
        .expect('code', 0)
        .end();
      await assertCoverage(cwd);
      const lcov = await fs.readFile(path.join(cwd, 'coverage/lcov.info'), 'utf8');
      assert.match(lcov, /SF:app\.ts/);
    });

    it('should success with COV_EXCLUDES', async () => {
      await coffee
        .fork(eggBin, ['cov', '--ts=false'], {
          cwd,
          env: {
            TESTS: 'test/a.test.js,test/b/b.test.js,test/ignore.test.js',
            COV_EXCLUDES: 'ignore/*',
          },
        })
        // .debug()
        .expect('stdout', /a\.test\.js/)
        .expect('stdout', /b[/|\\]b\.test\.js/)
        .notExpect('stdout', /a.js/)
        .expect('stdout', /Statements {3}:/)
        .expect('code', 0)
        .end();
      await assertCoverage(cwd);
      const lcov = await fs.readFile(path.join(cwd, 'coverage/lcov.info'), 'utf8');
      assert.doesNotMatch(lcov, /ignore[/|\\]a.js/);
    });

    it('should success with -x to ignore one dirs', async () => {
      await coffee
        .fork(eggBin, ['cov', '-x', 'ignore/', '--ts=false', 'test/a.test.js,test/b/b.test.js'], { cwd })
        // .debug()
        .expect('stdout', /a\.test\.js/)
        .expect('stdout', /b[/|\\]b\.test\.js/)
        .notExpect('stdout', /a.js/)
        .expect('stdout', /Statements {3}:/)
        .expect('code', 0)
        .end();
      await assertCoverage(cwd);
      const lcov = await fs.readFile(path.join(cwd, 'coverage/lcov.info'), 'utf8');
      assert.doesNotMatch(lcov, /ignore[/|\\]a.js/);
    });

    it('should success with -x to ignore multi dirs', async () => {
      await coffee
        .fork(eggBin, ['cov', '-x', 'ignore2/*', '-x', 'ignore/', '--ts=false', 'test/a.test.js,test/b/b.test.js'], {
          cwd,
        })
        // .debug()
        .expect('stdout', /a\.test\.js/)
        .expect('stdout', /b[/|\\]b\.test\.js/)
        .notExpect('stdout', /a.js/)
        .expect('stdout', /Statements {3}:/)
        .expect('code', 0)
        .end();
      await assertCoverage(cwd);
      const lcov = await fs.readFile(path.join(cwd, 'coverage/lcov.info'), 'utf8');
      assert.doesNotMatch(lcov, /ignore[/|\\]a.js/);
    });

    it('should exit when not test files', () => {
      return (
        coffee
          .fork(eggBin, ['cov', 'test/**/*.nth.js', '--ts=false'], { cwd })
          // .debug()
          .expect('stdout', /No test files found/)
          .expect('code', 0)
          .end()
      );
    });

    it.skip('should grep pattern without error', () => {
      return coffee
        .fork(eggBin, ['cov', 'test/a.test.js', '--grep', 'should success'], {
          cwd,
        })
        .debug()
        .expect('stdout', /a\.test\.js/)
        .notExpect('stdout', /should show tmp/)
        .expect('code', 0)
        .end();
    });

    it('should fail when test fail', () => {
      return (
        coffee
          .fork(eggBin, ['cov'], { cwd, env: { TESTS: 'test/fail.js' } })
          // .debug()
          .expect('stdout', /should fail/)
          .expect('stdout', /1 failed/)
          .expect('code', 1)
          .end()
      );
    });

    it('should run cov when no test files', () => {
      const cwd = getFixtures('prerequire');
      return (
        coffee
          .fork(eggBin, ['cov', '--ts=false'], {
            cwd,
            env: { TESTS: 'noexist.js' },
          })
          // .debug()
          .expect('code', 0)
          .end()
      );
    });

    it('should set NODE_ENV=test', async () => {
      const cwd = getFixtures('prerequire');
      await coffee
        .fork(eggBin, ['cov', '--ts=false'], {
          cwd,
          env: { TESTS: 'test/**/*.test.js' },
        })
        // .debug()
        .expect('stdout', /NODE_ENV test/)
        .expect('code', 0)
        .end();
    });

    it.skip('test parallel', () => {
      if (process.platform === 'win32') return;
      return (
        coffee
          .fork(eggBin, ['cov', '--parallel', '--ts=false'], {
            cwd: getFixtures('test-demo-app'),
            env: { TESTS: 'test/**/*.test.js' },
          })
          // .debug()
          .expect('stdout', /a\.test\.js/)
          .expect('code', 0)
          .end()
      );
    });

    it('should run cov on ts-esm module', () => {
      const cwd = getFixtures('mocha-test-ts-esm-cov');
      return (
        coffee
          .fork(eggBin, ['cov'], {
            cwd,
          })
          // .debug()
          .expect('stdout', /\.test\.ts/)
          .expect('stdout', /Tests.*passed/)
          .expect('code', 0)
          .end()
      );
    });

    it('should support egg.revert', () => {
      if (version !== 20) return;
      mock(process.env, 'NODE_ENV', 'development');
      return coffee
        .fork(eggBin, ['cov'], {
          cwd: getFixtures('egg-revert-cov'),
        })
        .debug()
        .expect('stdout', /SECURITY WARNING: Reverting CVE-2023-46809: Marvin attack on PKCS#1 padding/)
        .expect('stdout', /1 passed/)
        .expect('code', 0)
        .end();
    });
  });
});
