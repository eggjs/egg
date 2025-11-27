import fs from 'node:fs/promises';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';

import coffee from 'coffee';
import { detectPort } from 'detect-port';
import { mm, restore } from 'mm';
import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from 'vitest';

import { cleanup, replaceWeakRefMessage, type Coffee } from './utils.ts';

// const version = parseInt(process.version.split('.')[0].substring(1));
const __dirname = import.meta.dirname;

describe.skip('test/start-without-demon-3.test.ts', () => {
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
      // const result = await request(`http://127.0.0.1:${port}`);
      // expect(result.data.toString()).toBe('hi, egg');
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
      // const result = await request(`http://127.0.0.1:${port}`);
      // expect(result.data.toString()).toBe('hi, egg');
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
      // const result = await request(`http://127.0.0.1:${port}`);
      // expect(result.data.toString()).toBe('hi, egg');
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
      // const result = await request(`http://127.0.0.1:${port}/env`);
      // expect(result.data.toString()).toBe('pre, true');
    });
  });
});
