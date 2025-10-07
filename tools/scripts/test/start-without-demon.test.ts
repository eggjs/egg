import path from 'node:path';
import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';

import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from 'vitest';
import coffee from 'coffee';
import { request } from 'urllib';
import { mm, restore } from 'mm';
import { exists } from 'utility';
import { detectPort } from 'detect-port';

import { cleanup, replaceWeakRefMessage, type Coffee } from './utils.ts';
import { isWindows } from '../src/helper.ts';

// const version = parseInt(process.version.split('.')[0].substring(1));
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
      app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      // expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/@@@ inject script!/);
      expect(app.stdout).toMatch(/@@@ inject script1/);
      expect(app.stdout).toMatch(/@@@ inject script2/);
    });

    it('inject incorrect script', async () => {
      const script = './inject3.js';
      app = coffee.fork(eggBin, ['start', '--workers=1', `--require=${script}`], {
        cwd: fixturePath,
      }) as Coffee;
      // app.debug();
      await scheduler.wait(waitTime);
      expect(app.stderr).toMatch(/Cannot find module/);
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/@@@ inject script!/);
      expect(app.stdout).toMatch(/@@@ inject script1/);
      expect(app.stdout).toMatch(/@@@ inject script2/);
    });

    it('inject incorrect script', async () => {
      const script = './inject3.js';
      app = coffee.fork(eggBin, ['start', '--workers=1', `--require=${script}`], { cwd: fixturePath }) as Coffee;
      // app.debug();
      await scheduler.wait(waitTime);
      expect(app.stderr).toMatch(/Cannot find module/);
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
      expect(app.stdout).not.toMatch(/--require .*\/node_modules\/.*source-map-support/);
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      // assert(!app.stdout.includes('DeprecationWarning:'));
      expect(app.stdout).toMatch(/--title=egg-server-example/);
      expect(app.stdout).toMatch(/"title":"egg-server-example"/);
      expect(app.stdout).toMatch(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/);
      expect(app.stdout).toMatch(/app_worker#2:/);
      expect(app.stdout).not.toMatch(/app_worker#3:/);
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe('hi, egg');
    });

    it('should start --trace-warnings work', async () => {
      app = coffee.fork(eggBin, ['start', '--workers=1', path.join(__dirname, 'fixtures/trace-warnings')]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      // assert.match(app.stderr, /MaxListenersExceededWarning:/);
      // assert.match(app.stderr, /app.js:10:9/); // should had trace
      expect(app.stdout).not.toMatch(/DeprecationWarning:/);
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/READY!!!/);
      expect(app.stdout).toMatch(/--title=egg-server-example/);
      expect(app.stdout).toMatch(/"title":"egg-server-example"/);
      expect(app.stdout).toMatch(/custom-framework started on http:\/\/127\.0\.0\.1:7001/);
      expect(app.stdout).toMatch(/app_worker#2:/);
      expect(app.stdout).not.toMatch(/app_worker#3:/);
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
      expect(app.code).toBe(1);
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe('hi, egg');
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe('hi, egg');
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/yadan started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe('hi, yadan');
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/--title=egg-test/);
      expect(app.stdout).toMatch(/"title":"egg-test"/);
      expect(app.stdout).toMatch(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/);
      expect(app.stdout).toMatch(/app_worker#2:/);
      expect(app.stdout).not.toMatch(/app_worker#3:/);
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe('hi, egg');
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe('hi, egg');
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe('hi, egg');
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}/env`);
      expect(result.data.toString()).toBe('pre, true');
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/## EGG_SERVER_ENV is not pass/);
      expect(app.stdout).toMatch(/## CUSTOM_ENV: pre/);
      expect(app.stdout).toMatch(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/);
      let result = await request(`http://127.0.0.1:${port}/env`);
      expect(result.data.toString()).toBe('pre, true');
      result = await request(`http://127.0.0.1:${port}/path`);
      const appBinPath = path.join(fixturePath, 'node_modules/.bin');
      expect(result.data.toString()).toContain(`${appBinPath}${path.delimiter}`);
    });
  });

  describe.skip('--stdout --stderr', () => {
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
      expect(content).toMatch(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/);

      content = await fs.readFile(stderr, 'utf-8');
      expect(content).toBe('');
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
      expect(content).not.toMatch(/custom-framework started on http:\/\/127\.0\.0\.1:\d+/);
      let stats = await exists(stderr);
      expect(stats).toBe(false);
      stats = await exists(malicious);
      expect(stats).toBe(false);
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
      it('should start with daemon work', async () => {
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

        expect(replaceWeakRefMessage(app.stderr)).toBe('');
        expect(app.stdout).toMatch(/yadan started on http:\/\/127\.0\.0\.1:\d+/);
        const result = await request(`http://127.0.0.1:${port}`);
        expect(result.data.toString()).toBe('hi, yadan');
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
        expect(app.stderr).toMatch(/spawn invalid ENOENT/);
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

        expect(replaceWeakRefMessage(app.stderr)).toBe('');
        expect(app.stdout).toMatch(/yadan started on http:\/\/127\.0\.0\.1:\d+/);
        const result = await request(`http://127.0.0.1:${port}`);
        expect(result.data.toString()).toBe('hi, yadan');
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
        expect(app.stderr).toMatch(/spawn invalid ENOENT/);
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/egg started on http:\/\/127\.0\.0\.1:8000/);
      expect(app.stdout).not.toMatch(/app_worker#3:/);
      const result = await request('http://127.0.0.1:8000');
      expect(result.data.toString()).toBe('hi, egg');
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/maxHeaderSize: 20000/);
    });
  });

  describe.skip('read egg.revert', () => {
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
      app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      // expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/SECURITY WARNING: Reverting CVE-2023-46809: Marvin attack on PKCS#1 padding/);
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
      app = coffee.fork(eggBin, ['start', '--workers=2', `--port=${port}`, subDir], { cwd: rootDir }) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/egg started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toBe('hi, egg');
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

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/egg started on http:\/\/127\.0\.0\.1:\d+/);
      expect(app.stdout).not.toMatch(/app_worker#3:/);
      const result = await request(`http://127.0.0.1:${port}`);
      expect(result.data.toString()).toContain(`hi, ${expectPATH}`);
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
        expect(code).toBe(null);
      } else {
        expect(code).toBe(0);
      }
    });
  });
});
