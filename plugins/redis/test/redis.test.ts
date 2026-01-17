import compile from 'node:child_process';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { detectPort } from 'detect-port';
import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vite-plus/test';

function getFixtures(name: string) {
  return path.resolve(import.meta.dirname, 'fixtures', name);
}

const skip = !process.env.CI && (await detectPort(6379)) === 6379;

describe.skipIf(skip)('test/redis.test.ts', () => {
  describe('default config', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir: getFixtures('apps/redisapp-default'),
      });
      await app.ready();
    });
    afterAll(() => app.close());
    afterEach(mm.restore);

    it('should make default config stable', () => {
      expect(app.config.redis).toMatchSnapshot();
    });

    it('should query', async () => {
      await app.httpRequest().get('/').expect(200).expect('bar');
    });
  });

  describe('single client', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir: getFixtures('apps/redisapp'),
      });
      await app.ready();
    });
    afterAll(() => app.close());
    afterEach(mm.restore);

    it('should query', () => {
      return app.httpRequest().get('/').expect(200).expect('bar');
    });
  });

  describe('weak dependent', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir: getFixtures('apps/redisapp-weakdependent'),
      });
      await app.ready();
    });
    afterAll(() => app.close());
    afterEach(mm.restore);

    it('should query', () => {
      return app.httpRequest().get('/').expect(200).expect('bar');
    });
  });

  describe('single client supportTimeCommand = false', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir: getFixtures('apps/redisapp-supportTimeCommand-false'),
      });
      await app.ready();
    });
    afterAll(() => app.close());
    afterEach(mm.restore);

    it('should query', () => {
      return app.httpRequest().get('/').expect(200).expect('bar');
    });
  });

  describe('single client with customize ioredis', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir: getFixtures('apps/redisapp-customize'),
      });
      await app.ready();
    });
    afterAll(() => app.close());
    afterEach(mm.restore);

    it('should query', () => {
      return app.httpRequest().get('/').expect(200).expect('bar');
    });
  });

  describe('single client for ts', () => {
    let app: MockApplication;
    const destPath = getFixtures('apps/ts/redisapp-ts');
    const compilerPath = path.resolve('./node_modules/typescript/bin/tsc');

    beforeAll(async () => {
      // Add new dynamic compiler to compile from ts to js
      compile.execSync(`node ${compilerPath} -p ${destPath}`, {
        cwd: destPath,
        stdio: 'inherit',
      });
      app = mm.app({
        baseDir: getFixtures('apps/ts/redisapp-ts'),
      });
      await app.ready();
    });
    afterAll(async () => {
      // cleanup
      compile.execSync(`node ${compilerPath} --build --clean`);
      await app?.close();
    });

    it('should query', () => {
      return app.httpRequest().get('/').expect(200).expect('bar');
    });
  });

  describe('multi client for ts', () => {
    let app: MockApplication;
    const destPath = getFixtures('apps/ts-multi');
    const compilerPath = path.resolve('./node_modules/typescript/bin/tsc');
    beforeAll(async () => {
      // Add new dynamic compiler to compile from ts to js
      compile.execSync(`node ${compilerPath} -p ${destPath}`);
      app = mm.app({
        baseDir: getFixtures('apps/ts-multi/redisapp-ts'),
      });
      await app.ready();
    });
    afterAll(async () => {
      // cleanup
      compile.execSync(`node ${compilerPath} --build --clean`);
      await app?.close();
    });

    it('should query', () => {
      return app.httpRequest().get('/').expect(200).expect('bar');
    });
  });

  // TODO: make github action support sentinel
  describe.skip('redis sentinel', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir: getFixtures('apps/redissentinelapp'),
      });
      await app.ready();
    });
    afterAll(() => app.close());
    afterEach(mm.restore);

    it('should query', () => {
      return app.httpRequest().get('/').expect(200).expect('bar');
    });
  });

  describe('await ready event', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir: getFixtures('apps/redisapp-disable-offline-queue'),
      });
      await app.ready();
    });
    afterAll(() => app.close());
    afterEach(mm.restore);

    it('should query', () => {
      return app.httpRequest().get('/').expect(200).expect('bar');
    });
  });

  // TODO: make github action support redis start with path
  describe.skip('redis path', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir: getFixtures('apps/redispathapp'),
      });
      await app.ready();
    });
    afterAll(() => app.close());
    afterEach(mm.restore);

    it('should query', () => {
      return app.httpRequest().get('/').expect(200).expect('bar');
    });
  });
});
