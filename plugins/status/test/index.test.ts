import fs from 'node:fs/promises';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

describe('test/index.test.ts', () => {
  describe('default configuration with plugin factory', () => {
    const baseDir = path.join(import.meta.dirname, 'fixtures/apps/default');
    const statusFile = path.join(baseDir, 'egg.status');
    let app: MockApplication;

    beforeAll(async () => {
      app = mm.app({ baseDir });
      await app.ready();
    });
    beforeEach(() => fs.rm(statusFile, { force: true }));
    afterEach(async () => {
      await mm.restore();
      await fs.rm(statusFile, { force: true });
    });
    afterAll(() => app.close());

    it('should register immediately after meta', () => {
      const middleware = app.config.coreMiddleware;
      expect(middleware.indexOf('status')).toBe(middleware.indexOf('meta') + 1);
      expect(middleware.filter((name) => name === 'status')).toHaveLength(1);
    });

    it('should return 404 when the status file is missing', async () => {
      const res = await app.httpRequest().get('/egg.status').expect(404);
      expect(res.text).toMatch(/^status-default \(.+ ~ .+\), status: offline$/);
    });

    it('should return 200 when the status file exists', async () => {
      await fs.writeFile(statusFile, '');
      const res = await app.httpRequest().get('/egg.status').expect(200);
      expect(res.text).toMatch(/^status-default \(.+ ~ .+\), status: online$/);
    });

    it('should detect file creation and removal without restarting', async () => {
      await app.httpRequest().get('/egg.status').expect(404);
      await fs.writeFile(statusFile, 'ready');
      await app.httpRequest().get('/egg.status').expect(200);
      await fs.unlink(statusFile);
      const res = await app.httpRequest().get('/egg.status').expect(404);
      expect(res.text).toMatch(/, status: offline$/);
    });

    it('should match the path independently of the query string', async () => {
      await fs.writeFile(statusFile, 'ready');
      await app.httpRequest().get('/egg.status?probe=1').expect(200);
    });

    it('should support HEAD health checks', async () => {
      await app.httpRequest().head('/egg.status').expect(404);
      await fs.writeFile(statusFile, 'ready');
      await app.httpRequest().head('/egg.status').expect(200);
    });

    it('should pass other paths to downstream middleware and routes', async () => {
      await app.httpRequest().get('/').expect(200).expect('home');
      await app.httpRequest().get('/egg.status/extra').expect(200).expect('other route');
    });
  });

  describe('custom configuration with package declaration', () => {
    const baseDir = path.join(import.meta.dirname, 'fixtures/apps/custom');
    const statusFiles = [path.join(baseDir, 'first.status'), path.join(baseDir, 'second.status')];
    let app: MockApplication;

    async function removeStatusFiles() {
      await Promise.all(statusFiles.map((file) => fs.rm(file, { force: true })));
    }

    beforeAll(async () => {
      app = mm.app({ baseDir });
      await app.ready();
    });
    beforeEach(removeStatusFiles);
    afterEach(async () => {
      await mm.restore();
      await removeStatusFiles();
    });
    afterAll(() => app.close());

    it('should use the configured unavailable response on every health path', async () => {
      for (const url of ['/health', '/ready']) {
        const res = await app.httpRequest().get(url).expect(503);
        expect(res.text).toMatch(/^status-custom \(.+ ~ .+\), status: unavailable$/);
      }
    });

    it.each(statusFiles)('should report available when %s is the only existing file', async (statusFile) => {
      await fs.writeFile(statusFile, 'ready');
      for (const url of ['/health', '/ready']) {
        const res = await app.httpRequest().get(url).expect(200);
        expect(res.text).toMatch(/, status: ready$/);
      }
    });

    it('should replace the default health path', async () => {
      const res = await app.httpRequest().get('/egg.status').expect(404);
      expect(res.text).not.toContain('status:');
    });
  });
});
