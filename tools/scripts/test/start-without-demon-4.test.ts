import path from 'node:path';
import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';

import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from 'vitest';
import coffee from 'coffee';
import { request } from 'urllib';
import { mm, restore } from 'mm';
import { exists } from 'utility';
import { detectPort } from 'detect-port';

import { cleanup, replaceWeakRefMessage, type Coffee } from './utils.ts';

// const version = parseInt(process.version.split('.')[0].substring(1));
const __dirname = import.meta.dirname;

describe.skip('test/start-without-demon-4.test.ts', () => {
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
      // const result = await request(`http://127.0.0.1:${port}/env`);
      // expect(result.data.toString()).toBe('pre, true');
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
      // let result = await request(`http://127.0.0.1:${port}/env`);
      // expect(result.data.toString()).toBe('pre, true');
      // result = await request(`http://127.0.0.1:${port}/path`);
      // const appBinPath = path.join(fixturePath, 'node_modules/.bin');
      // expect(result.data.toString()).toContain(`${appBinPath}${path.delimiter}`);
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
      // expect(app.stdout).not.toMatch(/app_worker#3:/);
      // const result = await request('http://127.0.0.1:8000');
      // expect(result.data.toString()).toBe('hi, egg');
    });
  });
});
