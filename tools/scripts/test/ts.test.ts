import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import cp from 'node:child_process';
import { scheduler } from 'node:timers/promises';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import coffee from 'coffee';
import { request } from 'urllib';
import { mm, restore } from 'mm';
import { cleanup, replaceWeakRefMessage, Coffee } from './utils.ts';
import { isWindows, getSourceFilename } from '../src/helper.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test/ts.test.ts', () => {
  const eggBin = getSourceFilename('../bin/run.js');
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
      const result = cp.spawnSync('npm', ['run', isWindows ? 'windows-build' : 'build'], {
        cwd: fixturePath,
        shell: isWindows,
      });
      assert.equal(result.stderr.toString(), '');
    });

    afterEach(async () => {
      if (app?.proc) app.proc.kill('SIGTERM');
      await cleanup(fixturePath);
    });

    it('--ts', async () => {
      app = coffee.fork(eggBin, ['start', '--workers=1', '--ts', fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert.match(app.stdout, /egg started on http:\/\/127\.0\.0\.1:7001/);
      const result = await request('http://127.0.0.1:7001', { dataType: 'json' });
      // console.log(result.data);
      assert(result.data.stack.includes(path.normalize('app/controller/home.ts:6:13')));
    });

    it('--typescript', async () => {
      app = coffee.fork(eggBin, ['start', '--workers=1', '--typescript', fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert.match(app.stdout, /egg started on http:\/\/127\.0\.0\.1:7001/);
      const result = await request('http://127.0.0.1:7001', { dataType: 'json' });
      // console.log(result.data);
      assert(result.data.stack.includes(path.normalize('app/controller/home.ts:6:13')));
    });

    it('--sourcemap', async () => {
      app = coffee.fork(eggBin, ['start', '--workers=1', '--sourcemap', fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert.match(app.stdout, /egg started on http:\/\/127\.0\.0\.1:7001/);
      const result = await request('http://127.0.0.1:7001', { dataType: 'json' });
      // console.log(result.data);
      assert(result.data.stack.includes(path.normalize('app/controller/home.ts:6:13')));
    });
  });

  describe('pkg.egg.typescript', () => {
    let app: Coffee;
    beforeEach(async () => {
      fixturePath = path.join(__dirname, 'fixtures/ts-pkg');
      await cleanup(fixturePath);
      const result = cp.spawnSync('npm', ['run', isWindows ? 'windows-build' : 'build'], {
        cwd: fixturePath,
        shell: isWindows,
      });
      assert.equal(result.stderr.toString(), '');
    });

    afterEach(async () => {
      if (app?.proc) app.proc.kill('SIGTERM');
      await cleanup(fixturePath);
    });

    it('should got correct stack', async () => {
      app = coffee.fork(eggBin, ['start', '--workers=1', fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert.match(app.stdout, /egg started on http:\/\/127\.0\.0\.1:7001/);
      const result = await request('http://127.0.0.1:7001', { dataType: 'json' });
      console.log(result.data);
      assert.match(result.data.stack, /home\.ts:6:13/);
      // assert(result.data.stack.includes(path.normalize('app/controller/home.ts:6:13')));
    });
  });
});
