import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';
import { once } from 'node:events';

import { mm } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import { Application } from '../src/index.ts';
import {
  MockApplication,
  cluster,
  createApp,
  getFilepath,
  startLocalServer,
} from './utils.ts';

describe('test/application.test.ts', () => {
  let app: MockApplication;

  afterEach(mm.restore);

  describe('create application', () => {
    it('should throw options.baseDir required', () => {
      assert.throws(() => {
        new Application({
          baseDir: 1,
        } as any);
      }, /options.baseDir required, and must be a string/);
    });

    it('should throw options.baseDir not exist', () => {
      assert.throws(() => {
        new Application({
          baseDir: 'not-exist',
        });
      }, /not-exist not exists/);
    });

    it('should throw options.baseDir is not a directory', () => {
      assert.throws(() => {
        new Application({
          baseDir: getFilepath('custom-egg/index.js'),
        });
      }, /not a directory|no such file or directory/);
    });
  });

  describe('app start timeout', () => {
    afterEach(() => app.close());
    it('should emit `startTimeout` event', async () => {
      app = createApp('apps/app-start-timeout');
      await once(app, 'startTimeout');
    });
  });

  describe('app.keys', () => {
    it('should throw when config.keys missing on non-local and non-unittest env', async () => {
      mm.env('test');
      app = createApp('apps/keys-missing');
      await app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app close
      await app.close();
    });

    it('should throw when config.keys missing on unittest env', async () => {
      mm.env('unittest');
      app = createApp('apps/keys-missing');
      await app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app closed
      await app.close();
    });

    it('should throw when config.keys missing on local env', async () => {
      mm.env('local');
      app = createApp('apps/keys-missing');
      await app.ready();
      mm(app.config, 'keys', null);

      try {
        app.keys;
        throw new Error('should not run this');
      } catch (err: any) {
        assert(err.message === 'Please set config.keys first');
      }

      // make sure app closed
      await app.close();
    });

    it('should use exists keys', async () => {
      mm.env('unittest');
      app = createApp('apps/keys-exists');
      await app.ready();

      assert(app.keys);
      assert(app.keys);
      assert(app.config.keys === 'my keys');

      await app.close();
    });
  });

  describe('handle uncaughtException', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = cluster('apps/app-throw');
      return app.ready();
    });
    afterAll(() => app.close());

    it('should handle uncaughtException and log it', async () => {
      await app.httpRequest().get('/throw').expect('foo').expect(200);

      await scheduler.wait(1100);
      const logfile = path.join(
        getFilepath('apps/app-throw'),
        'logs/app-throw/common-error.log'
      );
      const body = fs.readFileSync(logfile, 'utf8');
      assert(
        body.includes(
          'ReferenceError: a is not defined (uncaughtException throw'
        )
      );
    });
  });

  describe('handle uncaughtException when error has only a getter', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = cluster('apps/app-throw');
      return app.ready();
    });
    afterAll(() => app.close());

    it('should handle uncaughtException and log it', async () => {
      await app
        .httpRequest()
        .get('/throw-error-setter')
        .expect('foo')
        .expect(200);

      await scheduler.wait(1100);
      const logfile = path.join(
        getFilepath('apps/app-throw'),
        'logs/app-throw/common-error.log'
      );
      const body = fs.readFileSync(logfile, 'utf8');
      assert(body.includes('abc (uncaughtException throw 1 times on pid'));
    });
  });

  describe('warn confused configurations', () => {
    it('should warn if confused configurations exist', async () => {
      const app = createApp('apps/confused-configuration');
      await app.ready();
      await scheduler.wait(1000);
      const logs = fs.readFileSync(
        getFilepath(
          'apps/confused-configuration/logs/confused-configuration/confused-configuration-web.log'
        ),
        'utf8'
      );
      assert.match(
        logs,
        /Unexpected config key `'bodyparser'` exists, Please use `'bodyParser'` instead\./
      );
      assert.match(
        logs,
        /Unexpected config key `'notFound'` exists, Please use `'notfound'` instead\./
      );
      assert.match(
        logs,
        /Unexpected config key `'sitefile'` exists, Please use `'siteFile'` instead\./
      );
      assert.match(
        logs,
        /Unexpected config key `'middlewares'` exists, Please use `'middleware'` instead\./
      );
      assert.match(
        logs,
        /Unexpected config key `'httpClient'` exists, Please use `'httpclient'` instead\./
      );
    });
  });

  describe('test on apps/demo', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = createApp('apps/demo');
      return app.ready();
    });
    afterAll(() => app.close());

    describe('application.deprecate', () => {
      it('should get deprecate with namespace egg', async () => {
        assert.equal(typeof app.deprecate, 'function');
      });
    });

    describe('curl()', () => {
      it('should curl success', async () => {
        const localServer = await startLocalServer();
        const res = await app.curl(`${localServer}/foo/app`);
        assert.equal(res.status, 200);
      });
    });

    describe('env', () => {
      it('should return app.config.env', () => {
        assert(app.env === app.config.env);
      });
    });

    describe('proxy', () => {
      it('should delegate app.config.proxy', () => {
        assert(app.proxy === app.config.proxy);
      });
    });

    describe('inspect && toJSON', () => {
      it('should override koa method', () => {
        const inspectResult = app.inspect();
        const jsonResult = app.toJSON();
        assert.deepEqual(inspectResult, jsonResult);
        assert.equal(inspectResult.env, app.config.env);
      });
    });

    describe('class style controller', () => {
      it('should work with class style controller', () => {
        return app
          .httpRequest()
          .get('/class-controller')
          .expect('this is bar!')
          .expect(200);
      });
    });

    describe('request and response event', () => {
      it('should emit when request success', async () => {
        await app
          .httpRequest()
          .get('/class-controller')
          .expect('this is bar!')
          .expect(200);
      });

      it('should emit when request error', async () => {
        await app.httpRequest().get('/obj-error').expect(500);
      });
    });
  });
});
