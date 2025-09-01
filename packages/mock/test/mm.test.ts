import { strict as assert } from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

const baseDir = getFixtures('apps/env-app');

describe('test/mm.test.ts', () => {
  afterEach(mm.restore);

  describe('mm.env()', () => {
    let app: MockApplication;
    beforeEach(() => {
      mm(process.env, 'EGG_HOME', baseDir);
    });
    afterEach(() => app.close());

    it('should mock unittest', async () => {
      app = mm.app({ baseDir: 'apps/env-app', cache: false });
      await app.ready();
      assert(app.config.fakeplugin.foo === 'bar-unittest');
      assert(app.config.logger.dir === path.join(baseDir, 'logs/env-app'));
    });

    it('should mock test', async () => {
      mm.env('test');
      app = mm.app({ baseDir: 'apps/env-app', cache: false });
      await app.ready();
      assert(app.config.fakeplugin.foo === 'bar-test');
      assert(app.config.logger.dir === path.join(baseDir, 'logs/env-app'));
    });

    it('should mock prod', async () => {
      mm.env('prod');
      app = mm.app({ baseDir: 'apps/env-app', cache: false });
      await app.ready();
      assert(app.config.fakeplugin.foo === 'bar-prod');
      assert(app.config.logger.dir === path.join(baseDir, 'logs/env-app'));
    });

    it('should mock default', async () => {
      mm.env('default');
      app = mm.app({ baseDir: 'apps/env-app', cache: false });
      await app.ready();
      assert(app.config.fakeplugin.foo === 'bar-default');
      assert(app.config.logger.dir === path.join(baseDir, 'logs/env-app'));
    });

    it('should mock unittest', async () => {
      mm.env('unittest');
      app = mm.app({ baseDir: 'apps/env-app', cache: false });
      await app.ready();
      assert(app.config.fakeplugin.foo === 'bar-unittest');
      assert(app.config.logger.dir === path.join(baseDir, 'logs/env-app'));
    });

    it('should mock local', async () => {
      mm.env('local');
      app = mm.app({ baseDir: 'apps/env-app', cache: false });
      await app.ready();
      assert(app.config.fakeplugin.foo === 'bar-default');
      assert(app.config.logger.dir === path.join(baseDir, 'logs/env-app'));
    });
  });

  describe('mm.app({ clean: false })', () => {
    let app: MockApplication;
    after(() => app.close());

    it('keep log dir', async () => {
      app = mm.app({ baseDir: 'apps/app-not-clean', clean: false });
      await app.ready();
      assert(fs.existsSync(getFixtures('apps/app-not-clean/logs/keep')));
    });
  });

  describe('mm.consoleLevel()', () => {
    it('should mock EGG_LOG', () => {
      mm.consoleLevel('none');
      assert(process.env.EGG_LOG === 'NONE');
    });

    it('should not mock', () => {
      mm.consoleLevel('');
      assert(!process.env.EGG_LOG);
    });
  });

  describe('mm.home', () => {
    let app: MockApplication;
    const baseDir = getFixtures('apps/mockhome');
    before(() => {
      mm.home(baseDir);
      app = mm.app({ baseDir: 'apps/mockhome', clean: false });
      return app.ready();
    });
    after(() => app.close());

    it('should mock home', () => {
      assert(app.config.HOME === baseDir);
    });

    it('should ignore when parameter is empty', () => {
      mm.home();
      assert(!process.env.EGG_HOME);
    });
  });

  describe('egg-mock', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir: 'apps/no-framework',
      });
      return app.ready();
    });
    after(() => app.close());

    it('should not be a framework', () => {
      app.mockEnv('prod test not work');
      assert(app.config.env === 'mocked by plugin');
    });
  });
});
