import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';

import coffee from 'coffee';
import { detectPort } from 'detect-port';
import { mm, restore } from 'mm';
import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from 'vitest';

import { isWindows } from '../src/helper.ts';
import { cleanup, replaceWeakRefMessage, type Coffee } from './utils.ts';

// const version = parseInt(process.version.split('.')[0].substring(1));
const __dirname = import.meta.dirname;

describe.skip('test/start-without-demon-5.test.ts', () => {
  const eggBin = path.join(__dirname, '../bin/run.js');
  const fixturePath = path.join(__dirname, 'fixtures/example');
  const homePath = path.join(__dirname, 'fixtures/home-start-without-demon');
  const waitTime = 10000;

  beforeAll(async () => {
    await fs.mkdir(homePath, { recursive: true });
  });
  afterAll(async () => {
    await fs.rm(homePath, { force: true, recursive: true });
  });
  beforeEach(() => mm(process.env, 'MOCK_HOME_DIR', homePath));
  afterEach(restore);

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
      // const result = await request(`http://127.0.0.1:${port}`);
      // expect(result.data.toString()).toBe('hi, egg');
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
      // const expectPATH =
      //   [path.join(fixturePath, 'node_modules/.bin'), path.join(fixturePath, '.node/bin')].join(path.delimiter) +
      //   path.delimiter;
      app = coffee.fork(eggBin, ['start', '--workers=2', `--port=${port}`, fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/egg started on http:\/\/127\.0\.0\.1:\d+/);
      expect(app.stdout).not.toMatch(/app_worker#3:/);
      // const result = await request(`http://127.0.0.1:${port}`);
      // expect(result.data.toString()).toContain(`hi, ${expectPATH}`);
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
