import path from 'node:path';
import { strict as assert } from 'node:assert';
import { rm } from 'node:fs/promises';
import fsPromise from 'node:fs/promises';
import { existsSync } from 'node:fs';
import coffee from 'coffee';
import { runscript } from 'runscript';
import utils from '../src/index.js';
import { getFilepath } from './helper.js';

describe('test/plugin.test.ts', () => {
  const cwd = getFilepath('egg-app');
  const tmp = getFilepath('tmp');

  beforeEach(async () => {
    await rm(tmp, { force: true, recursive: true });
    if (fsPromise.cp) {
      await fsPromise.cp(cwd, tmp, { force: true, recursive: true });
    } else {
      // Node.js 14
      await runscript(`cp -rf ${cwd} ${tmp}`);
    }
    assert(existsSync(tmp), `${tmp} not exists`);
  });
  afterEach(() => rm(tmp, { force: true, recursive: true }));

  describe('getPlugins()', () => {
    const bin = path.join(cwd, 'get_plugin.js');
    it('should get plugins using npm', async () => {
      let cmd = 'npm -v && npm install';
      if (!process.env.CI) {
        cmd += ' --registry=https://registry.npmmirror.com';
      }
      await runscript(cmd, { cwd: tmp });

      const args = JSON.stringify({
        baseDir: tmp,
        framework: path.join(tmp, 'node_modules/egg'),
      });
      await coffee.fork(bin, [ args ], { cwd: tmp })
        .debug()
        .expect('stdout', /get all plugins \["onerror",/)
        .expect('code', 0)
        .end();
    });

    it('should get plugins using npminstall', async () => {
      const cmd = process.env.CI ? 'npminstall' : 'npminstall -c';
      await runscript(cmd, { cwd: tmp });

      const args = JSON.stringify({
        baseDir: tmp,
        framework: path.join(tmp, 'node_modules/egg'),
      });
      await coffee.fork(bin, [ args ], { cwd: tmp })
        .debug()
        .expect('stdout', /get all plugins \["onerror",/)
        .expect('code', 0)
        .end();
    });

    it('should get plugins using npminstall on test', async () => {
      const cmd = process.env.CI ? 'npminstall' : 'npminstall -c';
      await runscript(cmd, { cwd: tmp });

      const args = JSON.stringify({
        baseDir: tmp,
        framework: path.join(tmp, 'node_modules/egg'),
        env: 'test',
      });
      await coffee.fork(bin, [ args ], { cwd: tmp })
        .debug()
        .expect('stdout', /get all plugins \["onerror",/)
        .expect('code', 0)
        .end();
      const plugins = await utils.getPlugins({
        baseDir: tmp,
        framework: path.join(tmp, 'node_modules/egg'),
      });
      assert(Object.keys(plugins).length > 0);
      // console.log(plugins);
      assert.equal(plugins.session.name, 'session');
    });
  });

  describe('getLoadUnits()', () => {
    const bin = path.join(cwd, 'get_loadunit.js');
    it('should get plugins using npm', async () => {
      let cmd = 'npm -v && npm install';
      if (!process.env.CI) {
        cmd += ' --registry=https://registry.npmmirror.com';
      }
      await runscript(cmd, { cwd: tmp });

      const args = JSON.stringify({
        baseDir: tmp,
        framework: path.join(tmp, 'node_modules/egg'),
      });
      await coffee.fork(bin, [ args ], { cwd: tmp })
        .debug()
        .expect('stdout', /get 11 plugin/)
        .expect('stdout', /get 1 framework/)
        .expect('stdout', /get 1 app/)
        .expect('code', 0)
        .end();
    });

    it('should get plugins using npminstall', async () => {
      const cmd = process.env.CI ? 'npminstall' : 'npminstall -c';
      await runscript(cmd, { cwd: tmp });

      const args = JSON.stringify({
        baseDir: tmp,
        framework: path.join(tmp, 'node_modules/egg'),
      });
      await coffee.fork(bin, [ args ], { cwd: tmp })
        .debug()
        .expect('stdout', /get 11 plugin/)
        .expect('stdout', /get 1 framework/)
        .expect('stdout', /get 1 app/)
        .expect('code', 0)
        .end();
      const units = await utils.getLoadUnits({
        baseDir: tmp,
        framework: path.join(tmp, 'node_modules/egg'),
      });
      assert(units.length > 0);
      // console.log(units);
      assert.equal(units[0].type, 'plugin');
    });

    it('should get plugins when baseDir is not exist', async () => {
      const cmd = process.env.CI ? 'npminstall' : 'npminstall -c';
      await runscript(cmd, { cwd: tmp });

      const args = JSON.stringify({
        framework: path.join(tmp, 'node_modules/egg'),
      });
      await coffee.fork(bin, [ args ], { cwd: tmp })
        .debug()
        .expect('stdout', /get 11 plugin/)
        .expect('stdout', /get 1 framework/)
        .expect('stdout', /get 1 app/)
        .expect('code', 0)
        .end();
    });

    it('should throw when no framework', async () => {
      await coffee.fork(bin, [ '{}' ], { cwd: tmp })
        .debug()
        .expect('stderr', /framework is required/)
        .expect('code', 1)
        .end();
    });

    it('should throw when framework is not exist', async () => {
      const args = JSON.stringify({
        framework: '/noexist',
      });
      await coffee.fork(bin, [ args ], { cwd: tmp })
        .debug()
        .expect('stderr', /\/noexist should exist/)
        .expect('code', 1)
        .end();
    });
  });

  describe('getConfig()', () => {
    const bin = path.join(tmp, 'get_config.js');
    it('should get configs using npm', async () => {
      let cmd = 'npm -v && npm install';
      if (!process.env.CI) {
        cmd += ' --registry=https://registry.npmmirror.com';
      }
      await runscript(cmd, { cwd: tmp });

      const args = JSON.stringify({
        baseDir: tmp,
        framework: path.join(tmp, 'node_modules/egg'),
      });
      await coffee.fork(bin, [ args ], { cwd: tmp })
        .debug()
        .expect('stdout', /get app configs \["middleware","coreMiddleware","session"/)
        .expect('code', 0)
        .end();
    });

    it('should get configs using npminstall on framework = egg', async () => {
      const cmd = process.env.CI ? 'npminstall' : 'npminstall -c';
      await runscript(cmd, { cwd: tmp });

      const args = JSON.stringify({
        baseDir: tmp,
        framework: path.join(tmp, 'node_modules/egg'),
      });
      await coffee.fork(bin, [ args ], { cwd: tmp })
        .debug()
        .expect('stdout', /get app configs \["middleware","coreMiddleware","session"/)
        .expect('code', 0)
        .end();
    });

    it('should get configs using npminstall on framework = custom egg', async () => {
      const cmd = process.env.CI ? 'npminstall' : 'npminstall -c';
      await runscript(cmd, { cwd: tmp });

      const args = JSON.stringify({
        baseDir: tmp,
        framework: path.join(tmp, 'node_modules/framework-demo'),
      });
      await coffee.fork(bin, [ args ], { cwd: tmp })
        .debug()
        .expect('stdout', /get app configs \["middleware","coreMiddleware","session"/)
        .expect('code', 0)
        .end();
      const config = await utils.getConfig({
        baseDir: tmp,
        framework: path.join(tmp, 'node_modules/framework-demo'),
      });
      assert(config);
      assert.equal(config.name, 'egg-app');
    });
  });
});
