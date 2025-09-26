import path from 'node:path';
import fs from 'node:fs/promises';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mock, type MockApplication } from '@eggjs/mock';

export function getFixtures(filename: string) {
  return path.join(import.meta.dirname, 'fixtures', filename);
}

describe('test/static.test.ts', () => {
  describe('serve public', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mock.app({
        baseDir: getFixtures('static-server'),
      });
      await app.ready();
    });

    afterAll(() => app.close());

    it('should get exists js file', () => {
      return app
        .httpRequest()
        .get('/public/foo.js')
        .expect(/console.log\('bar'\);[\r\n]/)
        .expect(200);
    });

    it('should get /public 404', () => {
      return app.httpRequest().get('/public').expect(404);
    });

    it('should 404', () => {
      return app.httpRequest().get('/public/foo404.js').expect(404);
    });

    it('should return 206 with partial content', () => {
      return app
        .httpRequest()
        .get('/public/foo.js')
        .set('range', 'bytes=0-10')
        .expect('Content-Length', '11')
        .expect('Accept-Ranges', 'bytes')
        .expect('Content-Range', process.platform === 'win32' ? 'bytes 0-10/21' : 'bytes 0-10/20')
        .expect('console.log')
        .expect(206);
    });

    it("should range don't effect non static router", () => {
      return app.httpRequest().get('/foo/bar').set('range', 'bytes=0-5').expect('hello world').expect(200);
    });
  });

  describe('serve dist', () => {
    let app: MockApplication;
    const jsFile: string = getFixtures('static-server-dist/dist/static/app/a.js');
    beforeAll(async () => {
      await fs.mkdir(path.dirname(jsFile), { recursive: true });
      await fs.writeFile(jsFile, "console.log('a')");
      app = mock.app({
        baseDir: getFixtures('static-server-dist'),
      });
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
      await fs.unlink(jsFile);
    });

    it('should get js', async () => {
      const res = await app.httpRequest().get('/static/app/a.js').expect(200);
      expect(res.text).toBe("console.log('a')");
    });

    it('should cache file', async () => {
      await app.httpRequest().get('/static/app/a.js').expect("console.log('a')").expect(200);
      await fs.writeFile(jsFile, "console.log('b')");
      await app.httpRequest().get('/static/app/a.js').expect("console.log('a')").expect(200);
    });
  });

  describe('serve custom using config.js', () => {
    let app: MockApplication;
    const jsFile: string = getFixtures('static-server-custom/dist/static/app/a.js');
    beforeAll(async () => {
      await fs.mkdir(path.dirname(jsFile), { recursive: true });
      await fs.writeFile(jsFile, "console.log('a')");
      app = mock.app({
        baseDir: getFixtures('static-server-custom'),
      });
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
      await fs.unlink(jsFile);
    });

    it('should get js', async () => {
      await app.httpRequest().get('/static-custom/app/a.js').expect("console.log('a')").expect(200);
    });
  });

  describe('serve multiple folder with options.dir', () => {
    let app: MockApplication;
    const jsFile = getFixtures('static-server-with-dir/dist/static/app/a.js');
    beforeAll(async () => {
      await fs.mkdir(path.dirname(jsFile), { recursive: true });
      await fs.writeFile(jsFile, "console.log('a')");
      app = mock.app({
        baseDir: getFixtures('static-server-with-dir'),
      });
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
      await fs.unlink(jsFile);
    });

    it('should get js correct from public folder', () => {
      return app
        .httpRequest()
        .get('/public/foo.js')
        .expect(/console.log\('bar'\);[\r\n]/)
        .expect(200);
    });

    it('should get js correct with range support', () => {
      return app
        .httpRequest()
        .get('/public/foo.js')
        .set('range', 'bytes=0-10')
        .expect('Content-Length', '11')
        .expect('Accept-Ranges', 'bytes')
        .expect('Content-Range', process.platform === 'win32' ? 'bytes 0-10/21' : 'bytes 0-10/20')
        .expect('console.log')
        .expect(206);
    });

    it('should get js correct from dist folder', () => {
      return app.httpRequest().get('/public/app/a.js').expect("console.log('a')").expect(200);
    });

    it('should cache file', async () => {
      await app.httpRequest().get('/public/app/a.js').expect("console.log('a')").expect(200);
      await fs.writeFile(jsFile, "console.log('b')");
      await app.httpRequest().get('/public/app/a.js').expect("console.log('a')").expect(200);
    });
  });

  describe('serve multiple folder with options.dirs', () => {
    let app: MockApplication;
    const jsFile = getFixtures('static-server-with-dirs/dist/static/app/a.js');
    beforeAll(async () => {
      await fs.mkdir(path.dirname(jsFile), { recursive: true });
      await fs.writeFile(jsFile, "console.log('a')");
      app = mock.app({
        baseDir: getFixtures('static-server-with-dirs'),
      });
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
      await fs.unlink(jsFile);
    });

    it('should get js correct from public folder', () => {
      return app
        .httpRequest()
        .get('/public/foo.js')
        .expect(/console.log\('bar'\);[\r\n]/)
        .expect(200);
    });

    it('should get js correct with range support', () => {
      return app
        .httpRequest()
        .get('/public/foo.js')
        .set('range', 'bytes=0-10')
        .expect('Content-Length', '11')
        .expect('Accept-Ranges', 'bytes')
        .expect('Content-Range', process.platform === 'win32' ? 'bytes 0-10/21' : 'bytes 0-10/20')
        .expect('console.log')
        .expect(206);
    });

    it('should get js correct from dist folder', () => {
      return app.httpRequest().get('/static/app/a.js').expect("console.log('a')").expect(200);
    });

    it('should cache file', async () => {
      await app.httpRequest().get('/static/app/a.js').expect("console.log('a')").expect(200);
      await fs.writeFile(jsFile, "console.log('b')");
      await app.httpRequest().get('/static/app/a.js').expect("console.log('a')").expect(200);
    });
  });
});
