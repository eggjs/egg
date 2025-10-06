import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import coffee from 'coffee';
import { request } from 'urllib';
import { mm, restore } from 'mm';
import { cleanup, replaceWeakRefMessage, Coffee } from './utils.ts';
import { isWindows, getSourceFilename } from '../src/helper.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test/stop.test.ts', () => {
  const eggBin = getSourceFilename('../bin/run.js');
  const fixturePath = path.join(__dirname, 'fixtures/example');
  const timeoutPath = path.join(__dirname, 'fixtures/stop-timeout');
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

  describe('stop without daemon', () => {
    let app: Coffee;
    let killer: Coffee;

    beforeEach(async () => {
      await cleanup(fixturePath);
      app = coffee.fork(eggBin, ['start', '--workers=2', fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);
      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert(app.stdout.match(/custom-framework started on http:\/\/127\.0\.0\.1:7001/));
      const result = await request('http://127.0.0.1:7001');
      assert.equal(result.data.toString(), 'hi, egg');
    });

    afterEach(async () => {
      app.proc.kill('SIGTERM');
      await cleanup(fixturePath);
    });

    it('should stop', async () => {
      killer = coffee.fork(eggBin, ['stop', fixturePath]) as Coffee;
      // killer.debug();
      killer.expect('code', 0);
      await killer.end();

      // make sure is kill not auto exist
      assert.doesNotMatch(app.stdout, /exist by env/);

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        assert.match(app.stdout, /\[master] master is killed by signal SIGTERM, closing/);
        assert.match(app.stdout, /\[master] exit with code:0/);
        assert.match(app.stdout, /\[app_worker] exit with code:0/);
        // assert(app.stdout.includes('[agent_worker] exit with code:0'));
      }

      assert.match(killer.stdout, /stopping egg application/);
      assert.match(killer.stdout, /got master pid \[\d+\]/);
    });
  });

  describe('stop with daemon', () => {
    beforeEach(async () => {
      await cleanup(fixturePath);
      await fs.rm(logDir, { force: true, recursive: true });
      await coffee
        .fork(eggBin, ['start', '--daemon', '--workers=2', fixturePath])
        // .debug()
        .expect('code', 0)
        .end();

      const result = await request('http://127.0.0.1:7001');
      assert(result.data.toString() === 'hi, egg');
    });
    afterEach(async () => {
      await cleanup(fixturePath);
    });

    it('should stop', async () => {
      await coffee
        .fork(eggBin, ['stop', fixturePath])
        .debug()
        .expect('stdout', /stopping egg application/)
        .expect('stdout', /got master pid \[\d+\]/i)
        .expect('code', 0)
        .end();

      // master log
      const stdout = await fs.readFile(path.join(logDir, 'master-stdout.log'), 'utf-8');

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        assert.match(stdout, /\[master] master is killed by signal SIGTERM, closing/);
        assert.match(stdout, /\[master] exit with code:0/);
        assert.match(stdout, /\[app_worker] exit with code:0/);
      }

      await coffee
        .fork(eggBin, ['stop', fixturePath])
        .debug()
        .expect('stderr', /can't detect any running egg process/)
        .expect('code', 0)
        .end();
    });
  });

  describe('stop with not exist', () => {
    it('should work', async () => {
      await cleanup(fixturePath);
      await coffee
        .fork(eggBin, ['stop', fixturePath])
        // .debug()
        .expect('stdout', /stopping egg application/)
        .expect('stderr', /can't detect any running egg process/)
        .expect('code', 0)
        .end();
    });
  });

  describe('stop --title', () => {
    let app: Coffee;
    let killer: Coffee;

    beforeEach(async () => {
      await cleanup(fixturePath);
      app = coffee.fork(eggBin, ['start', '--workers=2', '--title=example', fixturePath]) as Coffee;
      // app.debug();
      app.expect('code', 0);
      await scheduler.wait(waitTime);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert.match(app.stdout, /custom-framework started on http:\/\/127\.0\.0\.1:7001/);
      const result = await request('http://127.0.0.1:7001');
      assert(result.data.toString() === 'hi, egg');
    });

    afterEach(async () => {
      app.proc.kill('SIGTERM');
      await cleanup(fixturePath);
    });

    it('should stop only if the title matches exactly', async () => {
      // Because of'exmaple'.inclues('exmap') === true，if egg-scripts <= 2.1.0 and you run `.. stop --title=exmap`，the process with 'title:example' will also be killed unexpectedly
      await coffee
        .fork(eggBin, ['stop', '--title=examp', fixturePath])
        // .debug()
        .expect('stdout', /stopping egg application with --title=examp/)
        .expect('stderr', /can't detect any running egg process/)
        .expect('code', 0)
        .end();

      // stop only if the title matches exactly
      await coffee
        .fork(eggBin, ['stop', '--title=example', fixturePath])
        // .debug()
        .expect('stdout', /stopping egg application with --title=example/)
        .expect('stdout', /got master pid \[/)
        .expect('code', 0)
        .end();
    });

    it('should stop', async () => {
      await coffee
        .fork(eggBin, ['stop', '--title=random', fixturePath])
        .debug()
        .expect('stdout', /stopping egg application with --title=random/)
        .expect('stderr', /can't detect any running egg process/)
        .expect('code', 0)
        .end();

      killer = coffee.fork(eggBin, ['stop', '--title=example'], { cwd: fixturePath }) as Coffee;
      killer.debug();
      // killer.expect('code', 0);
      await killer.end();

      // make sure is kill not auto exist
      assert.doesNotMatch(app.stdout, /exist by env/);

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        assert(app.stdout.includes('[master] master is killed by signal SIGTERM, closing'));
        assert(app.stdout.includes('[master] exit with code:0'));
        assert(app.stdout.includes('[app_worker] exit with code:0'));
        // assert(app.stdout.includes('[agent_worker] exit with code:0'));
      }

      assert(killer.stdout.includes('stopping egg application with --title=example'));
      assert(killer.stdout.match(/got master pid \[\d+\]/i));
    });
  });

  describe('stop all', () => {
    let app: Coffee;
    let app2: Coffee;
    let killer: Coffee;

    beforeEach(async () => {
      await cleanup(fixturePath);
      app = coffee.fork(eggBin, ['start', '--workers=2', '--title=example', fixturePath]) as Coffee;
      app.debug();
      app.expect('code', 0);

      app2 = coffee.fork(eggBin, ['start', '--workers=2', '--title=test', '--port=7002', fixturePath]) as Coffee;
      app2.expect('code', 0);

      await scheduler.wait(10000);

      assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert.match(app.stdout, /custom-framework started on http:\/\/127\.0\.0\.1:7001/);
      const result = await request('http://127.0.0.1:7001');
      assert.equal(result.data.toString(), 'hi, egg');

      assert.equal(replaceWeakRefMessage(app2.stderr), '');
      assert.match(app2.stdout, /custom-framework started on http:\/\/127\.0\.0\.1:7002/);
      const result2 = await request('http://127.0.0.1:7002');
      assert.equal(result2.data.toString(), 'hi, egg');
    });

    afterEach(async () => {
      app.proc.kill('SIGTERM');
      app2.proc.kill('SIGTERM');
      await cleanup(fixturePath);
    });

    it('should stop', async () => {
      killer = coffee.fork(eggBin, ['stop'], { cwd: fixturePath }) as Coffee;
      killer.debug();
      // killer.expect('code', 0);
      await killer.end();

      // make sure is kill not auto exist
      assert(!app.stdout.includes('exist by env'));

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        assert(app.stdout.includes('[master] master is killed by signal SIGTERM, closing'));
        assert(app.stdout.includes('[master] exit with code:0'));
        assert(app.stdout.includes('[app_worker] exit with code:0'));
        // assert(app.stdout.includes('[agent_worker] exit with code:0'));
      }

      assert(killer.stdout.includes('stopping egg application'));
      assert(killer.stdout.match(/got master pid \[\d+,\d+\]/i));

      assert(!app2.stdout.includes('exist by env'));

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        assert(app2.stdout.includes('[master] master is killed by signal SIGTERM, closing'));
        assert(app2.stdout.includes('[master] exit with code:0'));
        assert(app2.stdout.includes('[app_worker] exit with code:0'));
      }
    });
  });

  describe('stop all with timeout', function () {
    let app: Coffee;
    let killer: Coffee;
    this.timeout(17000);
    beforeEach(async () => {
      await cleanup(timeoutPath);
      app = coffee.fork(eggBin, ['start', '--workers=2', '--title=stop-timeout', timeoutPath]) as Coffee;
      // app.debug();
      app.expect('code', 0);

      await scheduler.wait(waitTime);

      // assert.equal(replaceWeakRefMessage(app.stderr), '');
      assert(app.stdout.match(/http:\/\/127\.0\.0\.1:7001/));
      const result = await request('http://127.0.0.1:7001');
      assert(result.data.toString() === 'hi, egg');
    });

    afterEach(async () => {
      app.proc.kill('SIGTERM');
      await cleanup(timeoutPath);
    });

    it('should stop error without timeout', async () => {
      killer = coffee.fork(eggBin, ['stop'], { cwd: timeoutPath }) as Coffee;
      killer.debug();
      killer.expect('code', 0);
      await killer.end();
      await scheduler.wait(waitTime);

      // make sure is kill not auto exist
      assert(!app.stdout.includes('exist by env'));

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        assert(app.stdout.includes('[master] master is killed by signal SIGTERM, closing'));
        assert(app.stdout.match(/app_worker#\d+:\d+ disconnect/));
        assert(app.stdout.match(/don't fork, because worker:\d+ will be kill soon/));
      }

      assert(killer.stdout.includes('stopping egg application'));
      assert(killer.stdout.match(/got master pid \[\d+\]/i));
    });

    it('should stop success', async () => {
      killer = coffee.fork(eggBin, ['stop', '--timeout=10000'], { cwd: timeoutPath }) as Coffee;
      killer.debug();
      killer.expect('code', 0);

      // await killer.end();
      await scheduler.wait(waitTime);

      // make sure is kill not auto exist
      assert(!app.stdout.includes('exist by env'));

      // no way to handle the SIGTERM signal in windows ?
      if (!isWindows) {
        assert(app.stdout.includes('[master] master is killed by signal SIGTERM, closing'));
        assert(app.stdout.includes('[master] exit with code:0'));
        assert(app.stdout.includes('[agent_worker] exit with code:0'));
      }

      assert(killer.stdout.includes('stopping egg application'));
      assert(killer.stdout.match(/got master pid \[\d+\]/i));
    });
  });

  describe('stop with symlink', () => {
    const baseDir = path.join(__dirname, 'fixtures/tmp');

    beforeEach(async function () {
      // if we can't create a symlink, skip the test
      try {
        await fs.symlink(fixturePath, baseDir, 'dir');
      } catch (err: unknown) {
        // may get Error: EPERM: operation not permitted on windows
        console.log(`test skiped, can't create symlink: ${String(err)}`);
        this.skip();
      }

      // *unix get the real path of symlink, but windows wouldn't
      const appPathInRegexp = isWindows ? baseDir.replace(/\\/g, '\\\\') : fixturePath;

      await cleanup(fixturePath);
      await fs.rm(logDir, { force: true, recursive: true });
      await coffee
        .fork(eggBin, ['start', '--daemon', '--workers=2'], { cwd: baseDir })
        .debug()
        .expect('stdout', new RegExp(`Starting custom-framework application at ${appPathInRegexp}`))
        .expect('code', 0)
        .end();

      await fs.rm(baseDir, { force: true, recursive: true });
      const result = await request('http://127.0.0.1:7001');
      assert(result.data.toString() === 'hi, egg');
    });
    afterEach(async () => {
      await cleanup(fixturePath);
      await fs.rm(baseDir, { force: true, recursive: true });
    });

    it('should stop', async () => {
      await fs.rm(baseDir, { force: true, recursive: true });
      await fs.symlink(path.join(__dirname, 'fixtures/status'), baseDir);

      await coffee
        .fork(eggBin, ['stop', baseDir])
        .debug()
        .expect('stdout', /stopping egg application/)
        .expect('stdout', /got master pid \[\d+\]/i)
        .expect('code', 0)
        .end();
    });
  });
});
