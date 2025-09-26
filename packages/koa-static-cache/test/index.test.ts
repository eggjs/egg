import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import fs from 'node:fs';
import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';

import { request } from '@eggjs/supertest';
import { LRU } from 'ylru';
import { Application as Koa } from '@eggjs/koa';
import { describe, it } from 'vitest';

import { staticCache } from '../src/index.ts';

const __dirname = import.meta.dirname;
const readmeFile = path.join(__dirname, '..', 'README.md');

const app = new Koa();
const files: Record<string, any> = {};
app.use(
  staticCache(
    path.join(__dirname, '..'),
    {
      alias: {
        '/package': '/package.json',
        // windows
        '\\package': '\\package.json',
      },
      filter(file: string) {
        return !file.includes('node_modules');
      },
    },
    files
  )
);

const server = http.createServer(app.callback());

const app2 = new Koa();
app2.use(
  staticCache({
    dir: path.join(__dirname, '..'),
    buffer: true,
    filter(file: string) {
      return !file.includes('node_modules');
    },
  })
);
const server2 = http.createServer(app2.callback());

const app3 = new Koa();
app3.use(
  staticCache(path.join(__dirname, '..'), {
    buffer: true,
    gzip: true,
    filter(file: string) {
      return !file.includes('node_modules');
    },
  })
);
const server3 = http.createServer(app3.callback());

const app4 = new Koa();
const files4: Record<string, any> = {};
app4.use(
  staticCache(path.join(__dirname, '..'), {
    gzip: true,
    filter(file: string) {
      return !file.includes('node_modules');
    },
    files: files4,
  })
);

const app5 = new Koa();
app5.use(
  staticCache({
    buffer: true,
    prefix: '/static',
    dir: path.join(__dirname, '..'),
    filter(file: string) {
      return !file.includes('node_modules');
    },
  })
);
const server5 = http.createServer(app5.callback());

describe('cacheControl function', () => {
  const app = new Koa();
  app.use(
    staticCache({
      buffer: true,
      dir: path.join(__dirname, '..'),
      filter(file: string) {
        return !file.includes('node_modules');
      },
      cacheControl(path) {
        if (path.includes('index.ts')) {
          return 'public, max-age=1000';
        }
        return 'public, max-age=0';
      },
    })
  );
  const server = app.listen();

  it('should support cacheControl function', async () => {
    await request(server).get('/src/index.ts').expect('Cache-Control', 'public, max-age=1000').expect(200);
  });

  it('should support cacheControl function', async () => {
    await request(server).get('/test/index.test.ts').expect('Cache-Control', 'public, max-age=0').expect(200);
  });
});

describe('Static Cache', () => {
  it('should dir priority than options.dir', async () => {
    const app = new Koa();
    app.use(
      staticCache(path.join(__dirname, '..'), {
        dir: __dirname,
      })
    );
    const server = app.listen();
    await request(server).get('/src/index.ts').expect(200);
  });

  it('should default options.dir works fine', async () => {
    const app = new Koa();
    app.use(
      staticCache({
        dir: path.join(__dirname, '..'),
      })
    );
    const server = app.listen();
    await request(server).get('/src/index.ts').expect(200);
  });

  it.skipIf(process.platform === 'win32')('should accept abnormal path', async () => {
    const app = new Koa();
    app.use(
      staticCache({
        dir: path.join(__dirname, '..'),
      })
    );
    const server = app.listen();
    await request(server).get('//src/index.ts').expect(200);
  });

  it.skip('should default process.cwd() works fine', async () => {
    const app = new Koa();
    app.use(staticCache());
    const server = app.listen();
    await request(server).get('/package.json').expect(200);
  });

  it('should serve files', async () => {
    const res = await request(server)
      .get('/src/index.ts')
      .expect(200)
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Content-Type', /video\/mp2t/);
    assert(res.headers['content-length']);
    assert(res.headers['last-modified']);
    assert(res.headers.etag);
  });

  it('should serve files as buffers', async () => {
    const res = await request(server2)
      .get('/src/index.ts')
      .expect(200)
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Content-Type', /video\/mp2t/);
    assert(res.headers['content-length']);
    assert(res.headers['last-modified']);
    assert(res.headers.etag);
  });

  it('should serve recursive files', async () => {
    const res = await request(server)
      .get('/test/index.test.ts')
      .expect(200)
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Content-Type', /video\/mp2t/);
    assert(res.headers['content-length']);
    assert(res.headers['last-modified']);
    assert(res.headers.etag);
  });

  it('should not serve hidden files', async () => {
    await request(server).get('/.gitignore').expect(404);
  });

  it('should support conditional HEAD requests', async () => {
    const res = await request(server)
      .get('/src/index.ts')
      .expect(200)
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Content-Type', /video\/mp2t/);
    await request(server).head('/src/index.ts').set('If-None-Match', res.headers.etag).expect(304);
  });

  it('should support conditional GET requests', async () => {
    const res = await request(server)
      .get('/src/index.ts')
      .expect(200)
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Content-Type', /video\/mp2t/);
    await request(server).get('/src/index.ts').set('If-None-Match', res.headers.etag).expect(304);
  });

  it('should support HEAD', async () => {
    await request(server).head('/src/index.ts').expect(200);
  });

  it('should support 404 Not Found for other Methods to allow downstream', async () => {
    await request(server).put('/src/index.ts').expect(404);
  });

  it('should ignore query strings', async () => {
    await request(server).get('/src/index.ts?query=string').expect(200);
  });

  it('should alias paths', async () => {
    await request(server).get('/package').expect('Content-Type', /json/).expect(200);
  });

  it('should be configurable via object', async () => {
    if (process.platform === 'win32') {
      files['\\package.json'].maxAge = 1;
    } else {
      files['/package.json'].maxAge = 1;
    }

    await request(server).get('/package.json').expect('Cache-Control', 'public, max-age=1').expect(200);
  });

  it('should set the etag and content-md5 headers', async () => {
    const pk = fs.readFileSync(path.join(__dirname, '..', 'package.json'));
    const md5 = crypto.createHash('md5').update(pk).digest('base64');

    await request(server).get('/package.json').expect('ETag', `"${md5}"`).expect('Content-MD5', md5).expect(200);
  });

  it('should set Last-Modified if file modified and not buffered', async () => {
    await scheduler.wait(1000);
    const readme = fs.readFileSync(readmeFile, 'utf8');
    fs.writeFileSync(readmeFile, readme, 'utf8');
    const mtime = fs.statSync(readmeFile).mtime;
    const filename = process.platform === 'win32' ? '\\README.md' : '/README.md';
    const md5 = files[filename].md5;
    const res = await request(server).get('/README.md').expect(200);
    assert(res.headers['content-length']);
    assert(res.headers['last-modified']);
    assert(!res.headers.etag);
    assert.deepEqual(files[filename].mtime, mtime);
    await scheduler.wait(10);
    assert.equal(files[filename].md5, md5);
  });

  it.skipIf(process.env.CI)('should set Last-Modified if file rollback and not buffered', async () => {
    await scheduler.wait(1000);
    const readme = fs.readFileSync(readmeFile, 'utf8');
    fs.writeFileSync(readmeFile, readme, 'utf8');
    const mtime = fs.statSync(readmeFile).mtime;
    const filename = process.platform === 'win32' ? '\\README.md' : '/README.md';
    const md5 = files[filename].md5;
    const res = await request(server).get('/README.md').expect(200);
    assert(res.headers['content-length']);
    assert(res.headers['last-modified']);
    assert(!res.headers.etag);
    assert.deepEqual(files[filename].mtime, mtime);
    await scheduler.wait(10);
    assert.equal(files[filename].md5, md5);
  });

  it('should serve files with gzip buffer', async () => {
    const index = fs.readFileSync(path.join(__dirname, '../CHANGELOG.md'));
    const res = await request(server3)
      .get('/CHANGELOG.md')
      .set('Accept-Encoding', 'gzip')
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Content-Encoding', 'gzip')
      .expect('Content-Type', 'text/markdown; charset=utf-8')
      .expect('Content-Length', /^\d+$/)
      .expect('Vary', 'Accept-Encoding')
      .expect(index.toString())
      .expect(200);
    assert(res.headers['content-length']);
    assert(res.headers['last-modified']);
    assert(res.headers.etag);
  });

  it('should not serve files with gzip buffer when accept encoding not include gzip', async () => {
    const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'));
    const res = await request(server3)
      .get('/README.md')
      .set('Accept-Encoding', '')
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Content-Type', /text\/markdown/)
      .expect('Content-Length', /^\d+$/)
      .expect('Vary', 'Accept-Encoding')
      .expect(readme.toString())
      .expect(200);
    assert(!res.headers['content-encoding']);
    assert(res.headers['content-length']);
    assert(res.headers['last-modified']);
    assert(res.headers.etag);
  });

  it('should serve files with prefix', async () => {
    const res = await request(server5)
      .get('/static/src/index.ts')
      .expect('Cache-Control', 'public, max-age=0')
      .expect('Content-Type', /video\/mp2t/)
      .expect(200);
    assert(res.headers['content-length']);
    assert(res.headers['last-modified']);
    assert(res.headers.etag);
  });

  it('should 404 when dynamic = false', async () => {
    const app = new Koa();
    app.use(staticCache({ dynamic: false, dir: __dirname }));
    const server = app.listen();
    fs.writeFileSync(path.join(__dirname, 'a.js'), 'hello world');

    const res = await request(server).get('/a.js');
    fs.unlinkSync(path.join(__dirname, 'a.js'));
    assert.equal(res.status, 404);
  });

  it('should work fine when new file added in dynamic mode', async () => {
    const app = new Koa();
    app.use(staticCache({ dynamic: true, dir: __dirname }));
    const server = app.listen();
    fs.writeFileSync(path.join(__dirname, 'a.js'), 'hello world');

    const res = await request(server).get('/a.js');
    fs.unlinkSync(path.join(__dirname, 'a.js'));
    assert.equal(res.status, 200);
  });

  it('should work fine when new file added in dynamic and prefix mode', async () => {
    const app = new Koa();
    app.use(staticCache({ dynamic: true, prefix: '/static', dir: __dirname }));
    const server = app.listen();
    fs.writeFileSync(path.join(__dirname, 'a.js'), 'hello world');

    const res = await request(server).get('/static/a.js');
    fs.unlinkSync(path.join(__dirname, 'a.js'));
    assert.equal(res.status, 200);
  });

  it('should work fine when new file added in dynamic mode with LRU', async () => {
    const app = new Koa();
    const files = new LRU(1);
    app.use(staticCache({ dynamic: true, files, dir: __dirname }));
    const server = app.listen();
    fs.writeFileSync(path.join(__dirname, 'a.js'), 'hello world a');
    fs.writeFileSync(path.join(__dirname, 'b.js'), 'hello world b');
    fs.writeFileSync(path.join(__dirname, 'c.js'), 'hello world c');
    const filea = process.platform === 'win32' ? '\\a.js' : '/a.js';
    const fileb = process.platform === 'win32' ? '\\b.js' : '/b.js';
    const filec = process.platform === 'win32' ? '\\c.js' : '/c.js';

    await request(server).get('/a.js').expect(200);
    assert(files.get(filea));

    await request(server).get('/b.js').expect(200);
    assert(!files.get(filea));
    assert(files.get(fileb));

    await request(server).get('/c.js').expect(200);
    assert(!files.get(fileb));
    assert(files.get(filec));

    await request(server).get('/a.js').expect(200);
    assert(!files.get(filec));

    await request(server).get('/a.js').expect(200);
    assert(!files.get(filec));
    assert(files.get(filea));
    fs.unlinkSync(path.join(__dirname, 'a.js'));
    fs.unlinkSync(path.join(__dirname, 'b.js'));
    fs.unlinkSync(path.join(__dirname, 'c.js'));
  });

  it('should 404 when url without prefix in dynamic and prefix mode', async () => {
    const app = new Koa();
    app.use(staticCache({ dynamic: true, prefix: '/static', dir: __dirname }));
    const server = app.listen();
    fs.writeFileSync(path.join(__dirname, 'a.js'), 'hello world');

    const res = await request(server).get('/a.js');
    fs.unlinkSync(path.join(__dirname, 'a.js'));
    assert.equal(res.status, 404);
  });

  it('should 404 when new hidden file added in dynamic mode', async () => {
    const app = new Koa();
    app.use(staticCache({ dynamic: true, dir: __dirname }));
    const server = app.listen();
    fs.writeFileSync(path.join(__dirname, '.a.js'), 'hello world');

    const res = await request(server).get('/.a.js');
    fs.unlinkSync(path.join(__dirname, '.a.js'));
    assert.equal(res.status, 404);
  });

  it('should 404 when file not exist in dynamic mode', async () => {
    const app = new Koa();
    app.use(staticCache({ dynamic: true, dir: __dirname }));
    const server = app.listen();
    await request(server).get('/a.js').expect(404);
  });

  it('should 404 when file not exist', async () => {
    const app = new Koa();
    app.use(staticCache({ dynamic: true, dir: __dirname }));
    const server = app.listen();
    await request(server).get('/a.js').expect(404);
  });

  it('should 404 when is folder in dynamic mode', async () => {
    const app = new Koa();
    app.use(staticCache({ dynamic: true, dir: __dirname }));
    const server = app.listen();
    await request(server).get('/test').expect(404);
  });

  it('should array options.filter works fine', async () => {
    const app = new Koa();
    app.use(
      staticCache({
        dir: path.join(__dirname, '..'),
        filter: ['index.js'],
      })
    );
    const server = app.listen();
    await request(server).get('/README.md').expect(404);
  });

  it('should function options.filter works fine', async () => {
    const app = new Koa();
    app.use(
      staticCache({
        dir: path.join(__dirname, '..'),
        filter(file: string) {
          return file.indexOf('index.js') === 0;
        },
      })
    );
    const server = app.listen();
    await request(server).get('/README.md').expect(404);
  });

  it('should options.dynamic and options.preload works fine', async () => {
    const app = new Koa();
    const files: Record<string, any> = {};
    app.use(
      staticCache({
        dir: path.join(__dirname, '..'),
        preload: false,
        dynamic: true,
        files,
      })
    );
    assert.deepEqual(files, {});
    const res = await request(app.listen()).get('/package.json').expect(200);
    const filename = process.platform === 'win32' ? '\\package.json' : '/package.json';
    assert(files[filename]);
    assert(res.headers['content-length']);
    assert(res.headers['last-modified']);
    assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
  });

  it('should options.alias and options.preload works fine', async () => {
    const app = new Koa();
    const files: Record<string, any> = {};
    app.use(
      staticCache({
        dir: path.join(__dirname, '..'),
        preload: false,
        dynamic: true,
        alias: {
          '/package': '/package.json',
          '\\package': '\\package.json',
        },
        files,
      })
    );
    assert.deepEqual(files, {});
    const res = await request(app.listen()).get('/package').expect(200);

    const filename = process.platform === 'win32' ? '\\package.json' : '/package.json';
    assert(files[filename]);
    assert(!files['/package']);
    assert(!files['\\package']);
    assert(res.headers['content-length']);

    const res2 = await request(app.listen()).get('/package.json').expect(200);
    assert(files[filename]);
    assert(Object.keys(files).length === 1);
    assert(res2.headers['content-length']);
  });

  it('should loadFile under options.dir', async () => {
    const app = new Koa();
    app.use(
      staticCache({
        dir: __dirname,
        preload: false,
        dynamic: true,
      })
    );
    await request(app.listen()).get('/%2E%2E/package.json').expect(404);
  });
});
