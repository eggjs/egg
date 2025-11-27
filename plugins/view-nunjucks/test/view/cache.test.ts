import fs from 'node:fs';
import path from 'node:path';

import { mock, mm, type MockApplication } from '@eggjs/mock';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { getFixtures } from '../utils.ts';

describe('test/view/cache.test.ts', () => {
  afterEach(() => mock.restore());

  describe('should render cache template at prod', () => {
    let app: MockApplication;
    let templateFilePath: string;
    let templateContent: string;

    beforeEach(async () => {
      mm(process.env, 'EGG_SERVER_ENV', 'prod');

      app = mock.app({
        baseDir: getFixtures('cache/prod'),
        framework: getFixtures('framework'),
      });

      await app.ready();

      templateFilePath = path.join(app.config.baseDir, 'app/view/home.tpl');
      templateContent = fs.readFileSync(templateFilePath, {
        encoding: 'utf-8',
      });
    });

    afterEach(async () => {
      fs.writeFileSync(templateFilePath, templateContent);
      (app as any).nunjucks.cleanCache();
      await app.close();
    });

    it('use cache', async () => {
      await app
        .httpRequest()
        .get('/')
        .expect(200, /hi, egg/);

      fs.writeFileSync(templateFilePath, 'TEMPLATE CHANGED');

      await app
        .httpRequest()
        .get('/')
        .expect(200, /hi, egg/);
    });

    it('clean cache', async () => {
      await app
        .httpRequest()
        .get('/')
        .expect(200, /hi, egg/);

      await app
        .httpRequest()
        .get('/sub')
        .expect(200, /hi, sub egg/);

      fs.writeFileSync(templateFilePath, 'TEMPLATE CHANGED');

      const count = (app as any).nunjucks.cleanCache();
      expect(count).toBe(2);

      await app
        .httpRequest()
        .get('/')
        .expect(200, /TEMPLATE CHANGED/);
    });

    it('clean cache by name', async () => {
      await app
        .httpRequest()
        .get('/')
        .expect(200, /hi, egg/);

      fs.writeFileSync(templateFilePath, 'TEMPLATE CHANGED');

      const count = (app as any).nunjucks.cleanCache(templateFilePath);

      expect(count).toBe(1);

      await app
        .httpRequest()
        .get('/')
        .expect(200, /TEMPLATE CHANGED/);
    });

    it('clean cache by path', async () => {
      await app
        .httpRequest()
        .get('/')
        .expect(200, /hi, egg/);

      fs.writeFileSync(templateFilePath, 'TEMPLATE CHANGED');

      const count = (app as any).nunjucks.cleanCache(templateFilePath);

      expect(count).toBe(1);

      await app
        .httpRequest()
        .get('/')
        .expect(200, /TEMPLATE CHANGED/);
    });
  });

  describe('should render modified template in local env', () => {
    let app: MockApplication;
    let templateFilePath: string;
    let templateContent: string;

    beforeEach(async () => {
      mm(process.env, 'EGG_SERVER_ENV', 'local');

      app = mock.app({
        baseDir: getFixtures('cache/local'),
        framework: getFixtures('framework'),
      });
      await app.ready();

      templateFilePath = path.join(app.config.baseDir, 'app/view/home.tpl');
      templateContent = fs.readFileSync(templateFilePath, {
        encoding: 'utf-8',
      });
    });

    afterEach(async () => {
      if (templateContent) {
        fs.writeFileSync(templateFilePath, templateContent);
      }
      await app.close();
    });

    it('cache = false', async () => {
      await app
        .httpRequest()
        .get('/')
        .expect(200, /hi, egg/);

      fs.writeFileSync(templateFilePath, 'TEMPLATE CHANGED');

      await app
        .httpRequest()
        .get('/')
        .expect(200, /TEMPLATE CHANGED/);
    });
  });
});
