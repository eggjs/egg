import path from 'node:path';
import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';

import { describe, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import coffee from 'coffee';
import { request } from 'urllib';
import { mm, restore } from 'mm';
import { exists } from 'utility';
import { detectPort } from 'detect-port';

import { cleanup, replaceWeakRefMessage, type Coffee } from './utils.ts';
import { isWindows } from '../src/helper.ts';

const version = parseInt(process.version.split('.')[0].substring(1));
const __dirname = import.meta.dirname;

describe('test/start-without-demon.test.ts', () => {
  const eggBin = path.join(__dirname, '../bin/run.js');
  const fixturePath = path.join(__dirname, 'fixtures/example');
  const homePath = path.join(__dirname, 'fixtures/home-start-without-demon');
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
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--workers=2', `--port=${port}`, fixturePath]) as Coffee;
      app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      // assert(!app.stdout.includes('DeprecationWarning:'));
      assert(app.stdout.includes('--title=egg-server-example'));
      assert(app.stdout.includes('"title":"egg-server-example"'));
      assert.match(app.stdout, /custom-framework started on http:\/\/127\.0\.0\.1:\d+/);
      assert.match(app.stdout, /app_worker#2:/);
      assert.doesNotMatch(app.stdout, /app_worker#3:/);
      const result = await request(`http://127.0.0.1:${port}`);
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
      const port = await detectPort();
      app = coffee.fork(eggBin, [
        'start',
        '--workers=2',
        `--port=${port}`,
        path.relative(process.cwd(), fixturePath),
      ]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/));
      const result = await request(`http://127.0.0.1:${port}`);
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
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--workers=2', `--port=${port}`], { cwd: fixturePath }) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/));
      const result = await request(`http://127.0.0.1:${port}`);
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
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--framework=yadan', '--workers=2', `--port=${port}`, fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:\d+/));
      const result = await request(`http://127.0.0.1:${port}`);
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
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--workers=2', '--title=egg-test', `--port=${port}`, fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert(app.stdout.includes('--title=egg-test'));
      assert(app.stdout.includes('"title":"egg-test"'));
      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/));
      assert(app.stdout.includes('app_worker#2:'));
      assert(!app.stdout.includes('app_worker#3:'));
      const result = await request(`http://127.0.0.1:${port}`);
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
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', `--port=${port}`, '--workers=2', fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/));
      const result = await request(`http://127.0.0.1:${port}`);
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
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--workers=2', fixturePath], {
        env: Object.assign({}, process.env, { PORT: port }),
      }) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert.match(app.stdout, /custom-framework started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`);
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
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--workers=2', '--env=pre', `--port=${port}`, fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/));
      const result = await request(`http://127.0.0.1:${port}/env`);
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
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--workers=2', `--port=${port}`, fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert(app.stdout.includes('## EGG_SERVER_ENV is not pass'));
      assert(app.stdout.includes('## CUSTOM_ENV: pre'));
      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/));
      let result = await request(`http://127.0.0.1:${port}/env`);
      assert.equal(result.data.toString(), 'pre, true');
      result = await request(`http://127.0.0.1:${port}/path`);
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
      const port = await detectPort();
      app = coffee.fork(eggBin, [
        'start',
        '--workers=1',
        '--daemon',
        `--stdout=${stdout}`,
        `--stderr=${stderr}`,
        `--port=${port}`,
        fixturePath,
      ]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      let content = await fs.readFile(stdout, 'utf-8');
      assert.match(content, /custom-framework started on http:\/\/127\.0\.0\.1:\d+/);

      content = await fs.readFile(stderr, 'utf-8');
      assert.equal(content, '');
    });

    it('should start with insecurity --stderr argument', async () => {
      const cwd = path.join(__dirname, 'fixtures/status');
      mm(process.env, 'ERROR', 'error message');

      const stdout = path.join(fixturePath, 'start-fail/stdout.log');
      const stderr = path.join(fixturePath, 'start-fail/stderr.log');
      const malicious = path.join(fixturePath, 'start-fail/malicious');
      const port = await detectPort();
      app = coffee.fork(eggBin, [
        'start',
        '--workers=1',
        '--daemon',
        `--stdout=${stdout}`,
        `--stderr=${stderr}; touch ${malicious}`,
        `--port=${port}`,
        cwd,
      ]) as Coffee;
      // app.debug();

      await scheduler.wait(waitTime);

      const content = await fs.readFile(stdout, 'utf-8');
      assert(!content.match(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/));
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
        const port = await detectPort();
        app = coffee.fork(eggBin, [
          'start',
          '--daemon',
          '--framework=yadan',
          '--workers=2',
          `--node=${process.execPath}`,
          `--port=${port}`,
          fixturePath,
        ]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:\d+/));
        const result = await request(`http://127.0.0.1:${port}`);
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
        const port = await detectPort();
        app = coffee.fork(eggBin, [
          'start',
          '--framework=yadan',
          '--workers=2',
          `--node=${process.execPath}`,
          `--port=${port}`,
          fixturePath,
        ]) as Coffee;
        // app.debug();
        app.expect('code', 0);

        await scheduler.wait(waitTime);

        assert.equal(replaceWeakRefMessage(app.stderr), '');
        assert(app.stdout.match(/yadan started on http:\/\/127\.0\.0\.1:\d+/));
        const result = await request(`http://127.0.0.1:${port}`);
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
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--workers=2', subDir], { cwd: rootDir }) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert(app.stdout.match(/egg started on http:\/\/127\.0\.0\.1:\d+/));
      const result = await request(`http://127.0.0.1:${port}`);
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
      const port = await detectPort();
      const expectPATH =
        [path.join(fixturePath, 'node_modules/.bin'), path.join(fixturePath, '.node/bin')].join(path.delimiter) +
        path.delimiter;
      app = coffee.fork(eggBin, ['start', '--workers=2', `--port=${port}`, fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert.match(app.stdout, /egg started on http:\/\/127\.0\.0\.1:\d+/);
      assert(!app.stdout.includes('app_worker#3:'));
      const result = await request(`http://127.0.0.1:${port}`);
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
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', `--port=${port}`, '--workers=2', fixturePath]) as Coffee;
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
