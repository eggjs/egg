import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import coffee from 'coffee';
import { request } from 'urllib';
import { mm, restore } from 'mm';
import { exists } from 'utility';
import { cleanup, replaceWeakRefMessage, Coffee } from './utils.ts';
import { isWindows, getSourceFilename } from '../src/helper.ts';

const version = parseInt(process.version.split('.')[0].substring(1));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test/start.test.ts', () => {
  const eggBin = getSourceFilename('../bin/run.js');
  const fixturePath = path.join(__dirname, 'fixtures/example');
  const homePath = path.join(__dirname, 'fixtures/home');
  const logDir = path.join(homePath, 'logs');
  const waitTime = 10000;

  beforeAll(async () => {
    await fs.mkdir(homePath, { recursive: true });
  });
  afterAll(async () => {
    await fs.rm(homePath, { force: true, recursive: true });
  });
  beforeEach(() => mm(process.env, 'MOCK_HOME_DIR', homePath));
  afterEach(restore);

  describe('start without daemon', () => {
    describe('read pkgInfo on CommonJS', () => {
      let app: Coffee;
      let fixturePath: string;

      beforeAll(async () => {
        fixturePath = path.join(__dirname, 'fixtures/pkg-config');
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should --require work', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=1', '--require=./inject2.js'], {
          cwd: fixturePath,
        }) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert.match(app.stdout, /@@@ inject script!/);
        assert.match(app.stdout, /@@@ inject script1/);
        assert.match(app.stdout, /@@@ inject script2/);
      });

      it('inject incorrect script', async () => {
        const script = './inject3.js';
        app = coffee.fork(eggBin, ['start', '--workers=1', `--require=${script}`], {
          cwd: fixturePath,
        }) as Coffee;
        // app.debug();
        await scheduler.wait(waitTime);
        assert.match(app.stderr, /Cannot find module/);
        app.expect('code', 1);
      });
    });

    describe('read pkgInfo on ESM', () => {
      let app: Coffee;
      let fixturePath: string;

      beforeAll(async () => {
        fixturePath = path.join(__dirname, 'fixtures/pkg-config-esm');
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should --require work', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=1', '--require=./inject2.js'], {
          cwd: fixturePath,
        }) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert.match(app.stdout, /@@@ inject script!/);
        assert.match(app.stdout, /@@@ inject script1/);
        assert.match(app.stdout, /@@@ inject script2/);
      });

      it('inject incorrect script', async () => {
        const script = './inject3.js';
        app = coffee.fork(eggBin, ['start', '--workers=1', `--require=${script}`], { cwd: fixturePath }) as Coffee;
        // app.debug();
        await scheduler.wait(waitTime);
        assert.match(app.stderr, /Cannot find module/);
        app.expect('code', 1);
      });
    });

    describe('sourcemap default value should respect eggScriptConfig', () => {
      let app: Coffee;
      let fixturePath: string;

      beforeAll(async () => {
        fixturePath = path.join(__dirname, 'fixtures/pkg-config-sourcemap');
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should not enable sourcemap-support', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=1'], { cwd: fixturePath }) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);
        assert.doesNotMatch(app.stdout, /--require .*\/node_modules\/.*source-map-support/);
      });
    });

    describe('full path', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
      });

      afterEach(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=2', fixturePath]) as Coffee;
        app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        // assert(!app.stdout.includes('DeprecationWarning:'));
        assert(app.stdout.includes('--title=egg-server-example'));
        assert(app.stdout.includes('"title":"egg-server-example"'));
        assert.match(app.stdout, /custom-framework started on http:\/\/127\.0\.0\.1:7001/);
        assert.match(app.stdout, /app_worker#2:/);
        assert.doesNotMatch(app.stdout, /app_worker#3:/);
        const result = await request('http://127.0.0.1:7001');
        assert.equal(result.data.toString(), 'hi, egg');
      });

      it('should start --trace-warnings work', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=1', path.join(__dirname, 'fixtures/trace-warnings')]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        // assert.match(app.stderr, /MaxListenersExceededWarning:/);
        // assert.match(app.stderr, /app.js:10:9/); // should had trace
        assert.doesNotMatch(app.stdout, /DeprecationWarning:/);
      });

      it.skip('should get ready', async () => {
        app = coffee.fork(path.join(__dirname, './fixtures/ipc-bin/start.js'), [], {
          env: {
            BASE_DIR: fixturePath,
            PATH: process.env.PATH,
          },
        }) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.includes('READY!!!'));
        assert(app.stdout.includes('--title=egg-server-example'));
        assert(app.stdout.includes('"title":"egg-server-example"'));
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        assert(app.stdout.includes('app_worker#2:'));
        assert(!app.stdout.includes('app_worker#3:'));
      });
    });

    describe('child exit with 1', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should emit spawn error', async () => {
        const server = createServer(() => {});
        server.listen(7007);

        app = coffee.fork(eggBin, ['start', '--port=7007', '--workers=2', fixturePath]) as Coffee;

        await scheduler.wait(waitTime);
        server.close();
        assert.equal(app.code, 1);
      });
    });

    describe('relative path', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=2', path.relative(process.cwd(), fixturePath)]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        const result = await request('http://127.0.0.1:7001');
        assert.equal(result.data.toString(), 'hi, egg');
      });
    });

    describe('without baseDir', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=2'], { cwd: fixturePath }) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        const result = await request('http://127.0.0.1:7001');
        assert.equal(result.data.toString(), 'hi, egg');
      });
    });

    describe('--framework', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--framework=yadan', '--workers=2', fixturePath]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:7001/));
        const result = await request('http://127.0.0.1:7001');
        assert.equal(result.data.toString(), 'hi, yadan');
      });
    });

    describe('--title', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=2', '--title=egg-test', fixturePath]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.includes('--title=egg-test'));
        assert(app.stdout.includes('"title":"egg-test"'));
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        assert(app.stdout.includes('app_worker#2:'));
        assert(!app.stdout.includes('app_worker#3:'));
        const result = await request('http://127.0.0.1:7001');
        assert.equal(result.data.toString(), 'hi, egg');
      });
    });

    describe('--port', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--port=7002', '--workers=2', fixturePath]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7002/));
        const result = await request('http://127.0.0.1:7002');
        assert.equal(result.data.toString(), 'hi, egg');
      });
    });

    describe('process.env.PORT', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=2', fixturePath], {
          env: Object.assign({}, process.env, { PORT: 7002 }),
        }) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert.match(app.stdout, /custom-framework started on http:\/\/127\.0\.0\.1:7002/);
        const result = await request('http://127.0.0.1:7002');
        assert.equal(result.data.toString(), 'hi, egg');
      });
    });

    describe('--env', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=2', '--env=pre', fixturePath]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        const result = await request('http://127.0.0.1:7001/env');
        assert.equal(result.data.toString(), 'pre, true');
      });
    });

    describe('custom env', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        mm(process.env, 'CUSTOM_ENV', 'pre');
        app = coffee.fork(eggBin, ['start', '--workers=2', fixturePath]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.includes('## EGG_SERVER_ENV is not pass'));
        assert(app.stdout.includes('## CUSTOM_ENV: pre'));
        assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        let result = await request('http://127.0.0.1:7001/env');
        assert.equal(result.data.toString(), 'pre, true');
        result = await request('http://127.0.0.1:7001/path');
        const appBinPath = path.join(fixturePath, 'node_modules/.bin');
        assert(result.data.toString().startsWith(`${appBinPath}${path.delimiter}`));
      });
    });

    describe('--stdout --stderr', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
        await fs.rm(logDir, { force: true, recursive: true });
        await fs.rm(path.join(fixturePath, 'start-fail'), { force: true, recursive: true });
        await fs.mkdir(logDir, { recursive: true });
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
        await fs.rm(path.join(fixturePath, 'stdout.log'), { force: true });
        await fs.rm(path.join(fixturePath, 'stderr.log'), { force: true });
        await fs.rm(path.join(fixturePath, 'start-fail'), { force: true, recursive: true });
      });

      it('should start', async () => {
        const stdout = path.join(fixturePath, 'stdout.log');
        const stderr = path.join(fixturePath, 'stderr.log');
        app = coffee.fork(eggBin, [
          'start',
          '--workers=1',
          '--daemon',
          `--stdout=${stdout}`,
          `--stderr=${stderr}`,
          fixturePath,
        ]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        let content = await fs.readFile(stdout, 'utf-8');
        assert.match(content, /custom-framework started on http:\/\/127\.0\.0\.1:7001/);

        content = await fs.readFile(stderr, 'utf-8');
        assert.equal(content, '');
      });

      it('should start with insecurity --stderr argument', async () => {
        const cwd = path.join(__dirname, 'fixtures/status');
        mm(process.env, 'ERROR', 'error message');

        const stdout = path.join(fixturePath, 'start-fail/stdout.log');
        const stderr = path.join(fixturePath, 'start-fail/stderr.log');
        const malicious = path.join(fixturePath, 'start-fail/malicious');
        app = coffee.fork(eggBin, [
          'start',
          '--workers=1',
          '--daemon',
          `--stdout=${stdout}`,
          `--stderr=${stderr}; touch ${malicious}`,
          cwd,
        ]) as Coffee;
        // app.debug();

        await scheduler.wait(waitTime);

        const content = await fs.readFile(stdout, 'utf-8');
        assert(!content.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
        let stats = await exists(stderr);
        assert(!stats);
        stats = await exists(malicious);
        assert(!stats);
      });
    });

    describe('--node', () => {
      let app: Coffee;

      beforeEach(async () => {
        await cleanup(fixturePath);
      });

      beforeEach(async () => {
        if (app?.proc) app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      describe('daemon', () => {
        it('should start', async () => {
          app = coffee.fork(eggBin, [
            'start',
            '--daemon',
            '--framework=yadan',
            '--workers=2',
            `--node=${process.execPath}`,
            fixturePath,
          ]) as Coffee;
          // app.debug();
          app.expect('code', 0);

          await scheduler.wait(waitTime);

          assert.equal(replaceWeakRefMessage(app.stderr), '');
          assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:7001/));
          const result = await request('http://127.0.0.1:7001');
          assert.equal(result.data.toString(), 'hi, yadan');
        });

        it('should error if node path invalid', async () => {
          app = coffee.fork(eggBin, [
            'start',
            '--daemon',
            '--framework=yadan',
            '--workers=2',
            '--node=invalid',
            fixturePath,
          ]) as Coffee;
          // app.debug();
          app.expect('code', 1);

          await scheduler.wait(3000);
          assert.match(app.stderr, /spawn invalid ENOENT/);
        });
      });

      describe('not daemon', () => {
        it('should start', async () => {
          app = coffee.fork(eggBin, [
            'start',
            '--framework=yadan',
            '--workers=2',
            `--node=${process.execPath}`,
            fixturePath,
          ]) as Coffee;
          // app.debug();
          app.expect('code', 0);

          await scheduler.wait(waitTime);

          assert.equal(replaceWeakRefMessage(app.stderr), '');
          assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:7001/));
          const result = await request('http://127.0.0.1:7001');
          assert.equal(result.data.toString(), 'hi, yadan');
        });

        it('should error if node path invalid', async () => {
          app = coffee.fork(eggBin, [
            'start',
            '--framework=yadan',
            '--workers=2',
            '--node=invalid',
            fixturePath,
          ]) as Coffee;
          // app.debug();
          app.expect('code', 1);

          await scheduler.wait(3000);
          assert.match(app.stderr, /spawn invalid ENOENT/);
        });
      });
    });

    describe('read cluster config', () => {
      let app: Coffee;
      let fixturePath: string;

      beforeAll(async () => {
        fixturePath = path.join(__dirname, 'fixtures/cluster-config');
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=2', fixturePath]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:8000/));
        assert(!app.stdout.includes('app_worker#3:'));
        const result = await request('http://127.0.0.1:8000');
        assert.equal(result.data.toString(), 'hi, egg');
      });
    });

    describe('read eggScriptsConfig', () => {
      let app: Coffee;
      let fixturePath: string;

      beforeAll(async () => {
        fixturePath = path.join(__dirname, 'fixtures/egg-scripts-node-options');
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=1', fixturePath]) as Coffee;
        app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert.match(app.stdout, /maxHeaderSize: 20000/);
      });
    });

    describe('read egg.revert', () => {
      if (version !== 20) return;
      if (isWindows) return;
      let app: Coffee;
      let fixturePath: string;

      beforeAll(async () => {
        fixturePath = path.join(__dirname, 'fixtures/egg-revert');
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=1', fixturePath]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert.match(app.stdout, /SECURITY WARNING: Reverting CVE-2023-46809: Marvin attack on PKCS#1 padding/);
      });
    });

    describe('subDir as baseDir', () => {
      let app: Coffee;
      const rootDir = path.join(__dirname, '..');
      const subDir = path.join(__dirname, 'fixtures/subdir-as-basedir/base-dir');

      beforeAll(async () => {
        await cleanup(rootDir);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(rootDir);
      });

      it('should start', async () => {
        app = coffee.fork(eggBin, ['start', '--workers=2', subDir], { cwd: rootDir }) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:7001/));
        const result = await request('http://127.0.0.1:7001');
        assert.equal(result.data.toString(), 'hi, egg');
      });
    });

    describe('auto set custom node dir to PATH', () => {
      let app: Coffee;
      let fixturePath: string;

      beforeAll(async () => {
        fixturePath = path.join(__dirname, 'fixtures/custom-node-dir');
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        app.proc.kill('SIGTERM');
        await cleanup(fixturePath);
      });

      it('should start', async () => {
        const expectPATH =
          [path.join(fixturePath, 'node_modules/.bin'), path.join(fixturePath, '.node/bin')].join(path.delimiter) +
          path.delimiter;
        app = coffee.fork(eggBin, ['start', '--workers=2', '--port=7002', fixturePath]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert.match(app.stdout, /egg started on http:\/\/127\.0\.0\.1:7002/);
        assert(!app.stdout.includes('app_worker#3:'));
        const result = await request('http://127.0.0.1:7002');
        assert(result.data.toString().startsWith(`hi, ${expectPATH}`));
      });
    });

    describe('kill command', () => {
      let app: Coffee;

      beforeAll(async () => {
        await cleanup(fixturePath);
      });

      afterAll(async () => {
        await cleanup(fixturePath);
      });

      it('should wait child process exit', async () => {
        app = coffee.fork(eggBin, ['start', '--port=7007', '--workers=2', fixturePath]) as Coffee;
        await scheduler.wait(waitTime);
        const exitEvent = once(app.proc, 'exit');
        app.proc.kill('SIGTERM');
        const [code] = await exitEvent;
        if (isWindows) {
          assert(code === null);
        } else {
          assert.equal(code, 0);
        }
      });
    });
  });

  describe('start with daemon', () => {
    let cwd: string;
    beforeEach(async () => {
      if (cwd) {
        await cleanup(cwd);
      }
      await fs.rm(logDir, { force: true, recursive: true });
      await fs.mkdir(logDir, { recursive: true });
      await fs.writeFile(path.join(logDir, 'master-stdout.log'), 'just for test');
      await fs.writeFile(path.join(logDir, 'master-stderr.log'), 'just for test');
    });

    afterEach(async () => {
      await coffee
        .fork(eggBin, ['stop', cwd])
        // .debug()
        .end();
      await cleanup(cwd);
    });

    it('should start custom-framework', async () => {
      cwd = fixturePath;
      await coffee
        .fork(eggBin, ['start', '--daemon', '--workers=2', '--port=7002', cwd])
        // .debug()
        .expect('stdout', /Starting custom-framework application/)
        .expect('stdout', /custom-framework started on http:\/\/127\.0\.0\.1:7002/)
        .expect('code', 0)
        .end();

      // master log
      const stdout = await fs.readFile(path.join(logDir, 'master-stdout.log'), 'utf-8');
      const stderr = await fs.readFile(path.join(logDir, 'master-stderr.log'), 'utf-8');
      assert(stderr === '');
      assert.match(stdout, /custom-framework started on http:\/\/127\.0\.0\.1:7002/);

      // should rotate log
      const fileList = await fs.readdir(logDir);
      // console.log(fileList);
      assert(fileList.some(name => name.match(/master-stdout\.log\.\d+\.\d+/)));
      assert(fileList.some(name => name.match(/master-stderr\.log\.\d+\.\d+/)));

      const result = await request('http://127.0.0.1:7002');
      assert.equal(result.data.toString(), 'hi, egg');
    });

    it('should start default egg', async () => {
      cwd = path.join(__dirname, 'fixtures/egg-app');
      await coffee
        .fork(eggBin, ['start', '--daemon', '--workers=2', cwd])
        // .debug()
        .expect('stdout', /Starting egg application/)
        .expect('stdout', /egg started on http:\/\/127\.0\.0\.1:7001/)
        .expect('code', 0)
        .end();
    });
  });

  describe('check status', () => {
    let cwd: string;
    beforeEach(() => {
      cwd = path.join(__dirname, 'fixtures/status');
    });

    afterAll(async () => {
      await coffee
        .fork(eggBin, ['stop', cwd])
        // .debug()
        .end();
      await cleanup(cwd);
    });

    it('should status check success, exit with 0', async () => {
      mm(process.env, 'WAIT_TIME', 3000);
      await coffee
        .fork(eggBin, ['start', '--daemon', '--workers=1'], { cwd })
        // .debug()
        .expect('stdout', /Wait Start: 2.../)
        .expect('stdout', /custom-framework started/)
        .expect('code', 0)
        .end();
    });

    it('should status check fail `--ignore-stderr`, exit with 0', async () => {
      mm(process.env, 'WAIT_TIME', 3000);
      mm(process.env, 'ERROR', 'error message');
      const app = coffee.fork(eggBin, ['start', '--daemon', '--workers=1', '--ignore-stderr'], { cwd });
      // app.debug();
      // TODO: find a windows replacement for tail command
      if (!isWindows) {
        app.expect('stderr', /nodejs.Error: error message/);
      }
      await app
        .expect('stderr', /Start got error, see /)
        .expect('code', 0)
        .end();
    });

    it('should status check fail `--ignore-stderr` in package.json, exit with 0', async () => {
      cwd = path.join(__dirname, 'fixtures/egg-scripts-config');
      mm(process.env, 'WAIT_TIME', 3000);
      mm(process.env, 'ERROR', 'error message');

      const app = coffee.fork(eggBin, ['start'], { cwd });
      // app.debug();
      // TODO: find a windows replacement for tail command
      if (!isWindows) {
        app.expect('stderr', /nodejs.Error: error message/);
      }
      await app
        .expect('stderr', /Start got error, see /)
        .expect('code', 0)
        .end();
    });

    it('should status check fail, exit with 1', async () => {
      mm(process.env, 'WAIT_TIME', 3000);
      mm(process.env, 'ERROR', 'error message');

      const app = coffee.fork(eggBin, ['start', '--daemon', '--workers=1'], { cwd });
      // app.debug();
      // TODO: find a windows replacement for tail command
      if (!isWindows) {
        app.expect('stderr', /nodejs.Error: error message/);
      }
      await app
        .expect('stderr', /Start got error, see /)
        .expect('stderr', /Got error when startup/)
        .expect('code', 1)
        .end();
    });

    it('should status check timeout and exit with code 1', async () => {
      mm(process.env, 'WAIT_TIME', 10000);

      await coffee
        .fork(eggBin, ['start', '--daemon', '--workers=1', '--timeout=5000'], { cwd })
        // .debug()
        .expect('stdout', /Wait Start: 1.../)
        .expect('stderr', /Start failed, 5s timeout/)
        .expect('code', 1)
        .end();
    });
  });
});
