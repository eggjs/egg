import fs from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';

import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from '@voidzero-dev/vite-plus/test';
import coffee from 'coffee';
import { detectPort } from 'detect-port';
import { mm, restore } from 'mm';

import { cleanup, replaceWeakRefMessage, type Coffee } from './utils.ts';

// const version = parseInt(process.version.split('.')[0].substring(1));
const __dirname = import.meta.dirname;

describe.skip('test/start-without-demon-2.test.ts', () => {
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
      // const result = await request(`http://127.0.0.1:${port}`);
      // expect(result.data.toString()).toBe('hi, egg');
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
      app = coffee.fork(eggBin, ['start', '--workers=2', `--port=${port}`], {
        cwd: fixturePath,
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
      // const result = await request(`http://127.0.0.1:${port}`);
      // expect(result.data.toString()).toBe('hi, yadan');
    });
  });
});
