import cp from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';

import coffee from 'coffee';
import { detectPort } from 'detect-port';
import { mm, restore } from 'mm';
import { request } from 'urllib';
import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from 'vite-plus/test';

import { isWindows } from '../src/helper.ts';
import { cleanup, type Coffee } from './utils.ts';

const __dirname = import.meta.dirname;

describe.skip('test/ts.test.ts', () => {
  const eggBin = path.join(__dirname, '../bin/run.js');
  const homePath = path.join(__dirname, 'fixtures/home');
  const waitTime = 5000;
  let fixturePath: string;

  beforeEach(() => mm(process.env, 'MOCK_HOME_DIR', homePath));
  afterEach(restore);

  beforeAll(() => fs.mkdir(homePath, { recursive: true }));
  afterAll(() => fs.rm(homePath, { recursive: true, force: true }));

  describe('should display correct stack traces', () => {
    let app: Coffee;
    beforeEach(async () => {
      fixturePath = path.join(__dirname, 'fixtures/ts');
      await cleanup(fixturePath);
      cp.spawnSync('npm', ['run', isWindows ? 'windows-build' : 'build'], {
        cwd: fixturePath,
        shell: isWindows,
      });
    });

    afterEach(async () => {
      if (app?.proc) app.proc.kill('SIGTERM');
      await cleanup(fixturePath);
    });

    it('--ts', async () => {
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--workers=1', '--ts', `--port=${port}`, fixturePath]) as Coffee;
      app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      // expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/egg started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`, {
        dataType: 'json',
      });
      // console.log(result.data);
      expect(result.data.stack).toContain(path.normalize('app/controller/home.ts:6:13'));
    });

    it('--typescript', async () => {
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--workers=1', '--typescript', `--port=${port}`, fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      // expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/egg started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`, {
        dataType: 'json',
      });
      // console.log(result.data);
      expect(result.data.stack).toContain(path.normalize('app/controller/home.ts:6:13'));
    });

    it('--sourcemap', async () => {
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--workers=1', '--sourcemap', `--port=${port}`, fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      // expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/egg started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`, {
        dataType: 'json',
      });
      // console.log(result.data);
      expect(result.data.stack).toContain(path.normalize('app/controller/home.ts:6:13'));
    });
  });

  describe('pkg.egg.typescript', () => {
    let app: Coffee;
    beforeEach(async () => {
      fixturePath = path.join(__dirname, 'fixtures/ts-pkg');
      await cleanup(fixturePath);
      cp.spawnSync('npm', ['run', isWindows ? 'windows-build' : 'build'], {
        cwd: fixturePath,
        shell: isWindows,
      });
    });

    afterEach(async () => {
      if (app?.proc) app.proc.kill('SIGTERM');
      await cleanup(fixturePath);
    });

    it('should got correct stack', async () => {
      const port = await detectPort();
      app = coffee.fork(eggBin, ['start', '--workers=1', `--port=${port}`, fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      // expect(replaceWeakRefMessage(app.stderr)).toBe('');
      expect(app.stdout).toMatch(/egg started on http:\/\/127\.0\.0\.1:\d+/);
      const result = await request(`http://127.0.0.1:${port}`, {
        dataType: 'json',
      });
      // console.log(result.data);
      expect(result.data.stack).toMatch(/home\.ts:6:13/);
      // assert(result.data.stack.includes(path.normalize('app/controller/home.ts:6:13')));
    });
  });
});
