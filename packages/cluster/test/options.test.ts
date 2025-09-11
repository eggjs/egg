import path from 'node:path';
import { strict as assert } from 'node:assert';
import os from 'node:os';

import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';
import { mm } from '@eggjs/mock';
import { importResolve } from '@eggjs/utils';

import { parseOptions } from '../src/utils/options.ts';
import { getFilepath, cluster } from './utils.ts';

const __dirname = import.meta.dirname;

describe('test/options.test.ts', () => {
  afterEach(mm.restore);

  it('should return undefined by port as default', async () => {
    let options = await parseOptions({
      baseDir: path.join(__dirname, '..'),
    });
    assert.equal(options.port, undefined);
  });

  it('should start with https and listen 8443', async () => {
    const options = await parseOptions({
      baseDir: path.join(__dirname, '..'),
      https: {
        key: getFilepath('server.key'),
        cert: getFilepath('server.cert'),
      },
    });
    assert.equal(options.port, 8443);
    assert.equal(typeof options.https, 'object');
    assert(options.https instanceof Object);
    assert.equal(typeof options.https.key, 'string');
    assert(options.https.cert);
  });

  it('should start with httpsOptions and listen 8443', async () => {
    const options = await parseOptions({
      baseDir: path.join(__dirname, '..'),
      https: {
        passphrase: '123456',
        key: getFilepath('server.key'),
        cert: getFilepath('server.cert'),
        ca: getFilepath('server.ca'),
      },
    });
    assert.equal(options.port, 8443);
    assert(options.https instanceof Object);
    assert(options.https.key);
    assert(options.https.cert);
    assert(options.https.ca);
    assert(options.https.passphrase);
  });

  it('should listen custom port 6001', async () => {
    const options = await parseOptions({
      baseDir: path.join(__dirname, '..'),
      port: '6001',
    });
    assert.equal(options.port, 6001);
  });

  it('should set NO_DEPRECATION on production env', async () => {
    mm(process.env, 'NODE_ENV', 'production');
    let options = await parseOptions({
      baseDir: path.join(__dirname, '..'),
      workers: 1,
    });
    assert.equal(options.workers, 1);
    options = await parseOptions({
      baseDir: path.join(__dirname, '..'),
      workers: '101',
    });
    assert.equal(options.workers, 101);
    assert.equal(process.env.NO_DEPRECATION, '*');
  });

  it('should not extend when port is null/undefined', async () => {
    let options = await parseOptions({
      baseDir: path.join(__dirname, '..'),
      port: null,
    });
    assert.equal(options.port, undefined);
    options = await parseOptions({
      baseDir: path.join(__dirname, '..'),
      port: undefined,
    });
    assert.equal(options.port, undefined);
    options = await parseOptions({
      baseDir: path.join(__dirname, '..'),
    });
    assert.equal(options.port, undefined);
  });

  it('should not call os.cpus when specify workers', async () => {
    mm.syncError(os, 'cpus', 'should not call os.cpus');
    const options = await parseOptions({
      baseDir: path.join(__dirname, '..'),
      workers: 1,
    });
    assert.equal(options.workers, 1);
  });

  describe('debug', () => {
    it('empty', async () => {
      mm(process, 'execArgv', []);
      const options = await parseOptions({
        baseDir: path.join(__dirname, '..'),
      });
      assert(options.isDebug === undefined);
    });
    it('--inspect', async () => {
      mm(process, 'execArgv', ['--inspect=9229']);
      const options = await parseOptions({
        baseDir: path.join(__dirname, '..'),
      });
      assert(options.isDebug === true);
    });
    it('--debug', async () => {
      mm(process, 'execArgv', ['--debug=5858']);
      const options = await parseOptions({
        baseDir: path.join(__dirname, '..'),
      });
      assert(options.isDebug === true);
    });
  });

  describe('env', () => {
    it('default env is undefined', async () => {
      const options = await parseOptions({
        baseDir: path.join(__dirname, '..'),
      });
      assert.equal(options.env, undefined);
    });

    it('custom env = prod', async () => {
      const options = await parseOptions({
        env: 'prod',
        baseDir: path.join(__dirname, '..'),
      });
      assert.equal(options.env, 'prod');
    });

    it('default env set to process.env.EGG_SERVER_ENV', async () => {
      mm(process.env, 'EGG_SERVER_ENV', 'prod');
      const options = await parseOptions({
        baseDir: path.join(__dirname, '..'),
      });
      assert.equal(options.env, 'prod');
    });
  });

  describe('options', () => {
    let app: any;
    beforeAll(async () => {
      app = cluster('apps/options', {
        foo: true,
      } as any).debug();
      await app.ready();
    });
    afterAll(() => app.close());

    it('should be passed through', () => {
      app.expect('stdout', /app options foo: true/);
      app.expect('stdout', /agent options foo: true/);
    });
  });

  describe('framework', () => {
    it('should get from absolute path', async () => {
      let clusterPackagePath = path.join(__dirname, '..');
      const frameworkPath = path.dirname(
        importResolve('egg', { paths: [clusterPackagePath] })
      );
      const options = await parseOptions({
        framework: frameworkPath,
      });
      assert.equal(options.framework, frameworkPath);
    });

    it('should get from absolute path but not exist', async () => {
      const frameworkPath = path.join(__dirname, 'noexist');
      try {
        await parseOptions({
          framework: frameworkPath,
        });
        throw new Error('should not run');
      } catch (err: any) {
        assert.equal(err.message, `${frameworkPath} should exist`);
      }
    });

    it.skip('should get from npm package', async () => {
      const frameworkPath = path.join(process.cwd(), 'node_modules/egg');
      const options = await parseOptions({
        framework: 'egg',
      });
      assert.equal(options.framework, frameworkPath);
    });

    it('should get from npm package but not exist', async () => {
      try {
        await parseOptions({
          framework: 'noexist',
        });
        throw new Error('should not run');
      } catch (err: any) {
        const frameworkPath = path.join(process.cwd(), 'node_modules');
        assert.equal(err.message, `noexist is not found in ${frameworkPath}`);
      }
    });

    it('should get from pkg.egg.framework', async () => {
      const baseDir = path.join(__dirname, 'fixtures/apps/framework-pkg-egg');
      const options = await parseOptions({
        baseDir,
      });
      assert.equal(options.framework, path.join(baseDir, 'node_modules/yadan'));
    });

    it('should get from pkg.egg.framework but not exist', async () => {
      const baseDir = path.join(
        __dirname,
        'fixtures/apps/framework-pkg-egg-noexist'
      );
      try {
        await parseOptions({
          baseDir,
        });
        throw new Error('should not run');
      } catch (err: any) {
        const frameworkPaths = [
          path.join(baseDir, 'node_modules'),
          path.join(process.cwd(), 'node_modules'),
        ].join(',');
        assert.equal(err.message, `noexist is not found in ${frameworkPaths}`);
      }
    });

    it('should get egg by default', async () => {
      const baseDir = path.join(
        __dirname,
        'fixtures/apps/framework-egg-default'
      );
      const options = await parseOptions({
        baseDir,
      });
      const expectPaths = [
        // run int workspace root
        path.join(__dirname, '../../egg'),
        // run in project root
        path.join(__dirname, '../node_modules/egg'),
      ];
      assert(
        expectPaths.includes(options.framework),
        `should get egg at ${expectPaths.join(', ')}, but got ${options.framework}`
      );
    });
  });

  // it('should exist when specify baseDir', () => {
  //   it('should get egg by default but not exist', () => {
  //     const baseDir = path.join(__dirname, 'noexist');
  //     try {
  //       parseOptions({
  //         baseDir,
  //       });
  //       throw new Error('should not run');
  //     } catch (err) {
  //       assert(err.message === `${path.join(baseDir, 'package.json')} should exist`);
  //     }
  //   });
  // });
});
