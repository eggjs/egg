import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import coffee from 'coffee';
import { detectPort } from 'detect-port';
import { mm, restore } from 'mm';
import { request } from 'urllib';
import { describe, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

import { isWindows } from '../src/helper.ts';
import { cleanup } from './utils.ts';

const __dirname = import.meta.dirname;

describe.skip('test/start.test.ts', () => {
  const eggBin = path.join(__dirname, '../bin/run.js');
  const fixturePath = path.join(__dirname, 'fixtures/example');
  const homePath = path.join(__dirname, 'fixtures/home');
  const logDir = path.join(homePath, 'logs');

  beforeAll(async () => {
    await fs.mkdir(homePath, { recursive: true });
  });
  afterAll(async () => {
    await fs.rm(homePath, { force: true, recursive: true });
  });
  beforeEach(() => mm(process.env, 'MOCK_HOME_DIR', homePath));
  afterEach(restore);

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
      const port = await detectPort();
      await coffee
        .fork(eggBin, ['start', '--daemon', '--workers=2', `--port=${port}`, cwd])
        // .debug()
        .expect('stdout', /Starting custom-framework application/)
        .expect('stdout', /custom-framework started on http:\/\/127\.0\.0\.1:\d+/)
        .expect('code', 0)
        .end();

      // master log
      const stdout = await fs.readFile(path.join(logDir, 'master-stdout.log'), 'utf-8');
      const stderr = await fs.readFile(path.join(logDir, 'master-stderr.log'), 'utf-8');
      assert(stderr === '');
      assert.match(stdout, /custom-framework started on http:\/\/127\.0\.0\.1:\d+/);

      // should rotate log
      const fileList = await fs.readdir(logDir);
      // console.log(fileList);
      assert(fileList.some((name) => name.match(/master-stdout\.log\.\d+\.\d+/)));
      assert(fileList.some((name) => name.match(/master-stderr\.log\.\d+\.\d+/)));

      const result = await request(`http://127.0.0.1:${port}`);
      assert.equal(result.data.toString(), 'hi, egg');
    });

    it('should start default egg', async () => {
      cwd = path.join(__dirname, 'fixtures/egg-app');
      const port = await detectPort();
      await coffee
        .fork(eggBin, ['start', '--daemon', '--workers=2', `--port=${port}`, cwd])
        .debug()
        .expect('stdout', /Starting egg application/)
        .expect('stdout', /egg started on http:\/\/127\.0\.0\.1:\d+/)
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

      const app = coffee.fork(eggBin, ['start', '--daemon', '--workers=1'], {
        cwd,
      });
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
        .fork(eggBin, ['start', '--daemon', '--workers=1', '--timeout=5000'], {
          cwd,
        })
        // .debug()
        .expect('stdout', /Wait Start: 1.../)
        .expect('stderr', /Start failed, 5s timeout/)
        .expect('code', 1)
        .end();
    });
  });
});
