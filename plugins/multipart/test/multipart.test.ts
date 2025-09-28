import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { scheduler } from 'node:timers/promises';
import formstream from 'formstream';
import urllib from 'urllib';
import { mm, MockApplication } from '@eggjs/mock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test/multipart.test.ts', () => {
  describe('multipart', () => {
    let app: MockApplication;
    let server: any;
    let host: string;
    before(async () => {
      app = mm.app({
        baseDir: 'apps/multipart',
      });
      await app.ready();
      server = app.listen();
      host = 'http://127.0.0.1:' + server.address().port;
    });
    after(() => app.close());
    after(() => server.close());
    beforeEach(() => app.mockCsrf());
    afterEach(mm.restore);

    it('should not has clean_tmpdir schedule', async () => {
      try {
        await app.runSchedule('clean_tmpdir');
        throw new Error('should not run this');
      } catch (err: any) {
        assert.equal(err.message, '[@eggjs/schedule] Cannot find schedule clean_tmpdir');
      }
    });

    it('should alway register clean_tmpdir schedule in stream mode', async () => {
      const logger = app.loggers.scheduleLogger;
      const content = await fs.readFile(logger.options.file, 'utf8');
      assert.match(content, /\[@eggjs\/schedule\]: register schedule .+clean_tmpdir\.ts/);
    });

    it('should upload with csrf', async () => {
      const form = formstream();
      // form.file('file', filepath, filename);
      form.file('file', __filename);
      // other form fields
      form.field('foo', 'fengmk2').field('love', 'chair');

      const headers = form.headers();
      const res = await urllib.request(host + '/upload', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert.equal(res.status, 200);
      const data = JSON.parse(res.data);
      assert.equal(data.filename, 'multipart.test.ts');
    });

    it('should upload.json with ctoken', async () => {
      const form = formstream();
      // form.file('file', filepath, filename);
      form.file('file', __filename);
      // other form fields
      form.field('foo', 'fengmk2').field('love', 'chair');

      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert.equal(res.status, 200);
      const data = JSON.parse(res.data);
      assert.equal(data.filename, 'multipart.test.ts');
    });

    it('should handle unread stream and return error response', async () => {
      const form = formstream();
      // form.file('file', filepath, filename);
      form.file('file', __filename);
      // other form fields
      form.field('foo', 'fengmk2').field('love', 'chair');

      const headers = form.headers();
      const res = await urllib.request(host + '/upload?mock_stream_error=1', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert.match(res.data.toString(), /ENOENT:/);
    });

    it('should auto consumed file stream on error throw', async () => {
      for (let i = 0; i < 10; i++) {
        const form = formstream();
        form.file('file', path.join(__dirname, 'fixtures/bigfile.txt'));

        const headers = form.headers();
        const url = host + '/upload?mock_undefined_error=1';
        const result = await urllib.request(url, {
          method: 'POST',
          headers,
          stream: form as any,
          dataType: 'json',
        });

        assert(result.status === 500);
        const data = result.data;
        assert(data.message === 'part.foo is not a function');
        await scheduler.wait(100);
      }
    });

    it('should throw 400 when extname wrong', async () => {
      const form = formstream();
      form.file('file', __filename, 'foo.rar');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 400);
      const data = JSON.parse(res.data);
      assert(data.message === 'Invalid filename: foo.rar');
    });

    it('should not throw 400 when file not speicified', async () => {
      const form = formstream();
      // 模拟用户未选择文件点击了上传，这时 cotroller 是有 file stream 的，因为指定了 MIME application/octet-stream
      form.buffer('file', Buffer.from(''), '', 'application/octet-stream');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.message === 'no file');
    });

    it('should not throw 400 when file stream empty', async () => {
      const form = formstream();
      form.field('foo', 'bar');
      // 模拟用户未选择文件点击了上传，这时 cotroller 是有 file stream 的，因为指定了 MIME application/octet-stream
      // form.buffer('file', Buffer.from(''), '', 'application/octet-stream');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.message === 'no file');
    });

    it('should upload when extname speicified in fileExtensions', async () => {
      const form = formstream();
      form.file('file', __filename, 'bar.foo');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar.foo');
    });

    it('should upload when extname speicified in fileExtensions and extname is in upper case', async () => {
      const form = formstream();
      form.file('file', __filename, 'bar.BAR');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar.BAR');
    });

    it('should upload when extname speicified in fileExtensions and extname is missing dot', async () => {
      const form = formstream();
      form.file('file', __filename, 'bar.abc');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar.abc');
    });

    it('should upload when extname is not speicified', async () => {
      const form = formstream();
      form.file('file', __filename, 'bar');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar');
    });

    it('should 400 upload with wrong content-type', async () => {
      const res = await urllib.request(host + '/upload', {
        method: 'POST',
      });

      assert(res.status === 400);
      assert(/Content-Type must be multipart/.test(res.data));
    });

    it('should 400 upload.json with wrong content-type', async () => {
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        dataType: 'json',
      });

      assert(res.status === 400);
      assert(res.data.message === 'Content-Type must be multipart/*');
    });
  });

  describe('whitelist', () => {
    let app: MockApplication;
    let server: any;
    let host: string;
    before(async () => {
      app = mm.app({
        baseDir: 'apps/multipart-with-whitelist',
      });
      await app.ready();
      server = app.listen();
      host = 'http://127.0.0.1:' + server.address().port;
    });
    after(() => app.close());
    after(() => server.close());
    beforeEach(() => app.mockCsrf());
    afterEach(mm.restore);

    it('should upload when extname speicified in whitelist', async () => {
      const form = formstream();
      form.file('file', __filename, 'bar.whitelist');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar.whitelist');
    });

    it('should upload when extname speicified in whitelist and extname is in upper case', async () => {
      const form = formstream();
      form.file('file', __filename, 'bar.WHITELIST');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar.WHITELIST');
    });

    it('should throw 400 when extname speicified in fileExtensions, but not in whitelist', async () => {
      const form = formstream();
      form.file('file', __filename, 'foo.foo');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 400);
      const data = JSON.parse(res.data);
      assert(data.message === 'Invalid filename: foo.foo');
    });
  });

  describe('whitelist-function', () => {
    let app: MockApplication;
    let server: any;
    let host: string;
    before(async () => {
      app = mm.app({
        baseDir: 'apps/whitelist-function',
      });
      await app.ready();
      server = app.listen();
      host = 'http://127.0.0.1:' + server.address().port;
    });
    after(() => app.close());
    after(() => server.close());
    beforeEach(() => app.mockCsrf());
    afterEach(mm.restore);

    it('should upload when extname pass whitelist function', async () => {
      const form = formstream();
      form.file('file', __filename, 'bar');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 200);
      const data = JSON.parse(res.data);
      assert(data.filename === 'bar');
    });

    it('should throw 400 when extname not match whitelist function', async () => {
      const form = formstream();
      form.file('file', __filename, 'foo.png');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 400);
      const data = JSON.parse(res.data);
      assert(data.message === 'Invalid filename: foo.png');
    });

    it('should throw 400 when whitelist function throw error', async () => {
      const form = formstream();
      form.file('file', __filename, 'error');
      const headers = form.headers();
      const res = await urllib.request(host + '/upload.json', {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 400);
      const data = JSON.parse(res.data);
      assert(data.message === 'mock checkExt error');
    });
  });

  describe('upload one file', () => {
    let app: MockApplication;
    let server: any;
    let host: string;
    before(async () => {
      app = mm.app({
        baseDir: 'apps/upload-one-file',
      });
      await app.ready();
      server = app.listen();
      host = 'http://127.0.0.1:' + server.address().port;
    });
    before(async () => {
      await app.httpRequest().get('/upload').expect(200);
    });
    after(() => app.close());
    after(() => server.close());
    beforeEach(() => app.mockCsrf());
    afterEach(mm.restore);

    it('should handle one upload file in simple way', async () => {
      const form = formstream();
      form.field('foo', 'bar').field('[', 'toString').field(']', 'toString');
      form.file('file', __filename);

      const headers = form.headers();
      const url = host + '/upload';
      const res = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
        dataType: 'json',
      });

      const data = res.data;
      assert.deepEqual(data.fields, {
        '[': 'toString',
        ']': 'toString',
        foo: 'bar',
      });
      assert(data.status === 200);
      assert(typeof data.name === 'string');
      assert(data.url.includes('http://mockoss.com/egg-multipart-test/'));
    });

    it('should handle one upload file in simple way with async function controller', async () => {
      const form = formstream();
      form.file('file', __filename);

      const headers = form.headers();
      const url = host + '/upload/async';
      const res = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
        dataType: 'json',
      });

      const data = res.data;
      assert.deepEqual(data.fields, {});
      assert(data.status === 200);
      assert(typeof data.name === 'string');
      assert(data.url.includes('http://mockoss.com/egg-multipart-test/'));
    });

    it('should handle one upload file and all fields', async () => {
      const form = formstream();
      form.field('f1', 'f1-value');
      form.field('f2', 'f2-value-中文');
      form.file('file', __filename);

      const headers = form.headers();
      const url = host + '/upload';
      const res = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
        dataType: 'json',
      });

      const data = res.data;
      assert(res.status === 200);
      assert(data.status === 200);
      assert(typeof data.name === 'string');
      assert(data.url.includes('http://mockoss.com/egg-multipart-test/'));
      assert.deepEqual(data.fields, {
        f1: 'f1-value',
        f2: 'f2-value-中文',
      });
    });

    it('should handle non-ascii filename', async () => {
      const file = path.join(__dirname, 'fixtures', '中文名.js');
      const form = formstream();
      form.file('file', file);

      const headers = form.headers();
      const url = host + '/upload/async';
      const res = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
        dataType: 'json',
      });

      const data = res.data;
      assert(data.name.includes('中文名'));
    });

    it('should 400 when no file upload', async () => {
      const form = formstream();
      form.field('hi', 'ok');

      const headers = form.headers();
      const url = host + '/upload';
      const res = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
      });

      assert(res.status === 400);
      assert(res.data.toString().includes("Can't found upload file"));
    });

    it('should no file upload and only fields', async () => {
      const form = formstream();
      form.field('hi', 'ok');
      form.field('hi2', 'ok2');

      const headers = form.headers();
      const url = host + '/upload/allowEmpty';
      const res = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
        dataType: 'json',
      });

      assert(res.status === 200);
      assert.deepEqual(res.data, {
        fields: {
          hi: 'ok',
          hi2: 'ok2',
        },
      });
    });

    it('should 400 when no file speicified', async () => {
      const form = formstream();
      form.buffer('file', Buffer.from(''), '', 'application/octet-stream');
      const headers = form.headers();
      const url = host + '/upload';
      const res = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
      });
      assert(res.status === 400);
      assert(res.data.toString().includes("Can't found upload file"));
    });

    it('should auto consumed file stream on error throw', async () => {
      for (let i = 0; i < 10; i++) {
        const form = formstream();
        form.file('file', path.join(__dirname, 'fixtures/bigfile.txt'));

        const headers = form.headers();
        const url = host + '/upload/async?foo=error';
        const result = await urllib.request(url, {
          method: 'POST',
          headers,
          stream: form as any,
          dataType: 'json',
        });

        assert(result.status === 500);
        const data = result.data;
        assert(data.message === 'stream.foo is not a function');
        await scheduler.wait(100);
      }
    });

    it('should file hit limits fileSize', async () => {
      const form = formstream();
      form.buffer('file', Buffer.from('a'.repeat(1024 * 1024 * 100)), 'foo.js');
      const headers = form.headers();
      const url = host + '/upload/async?fileSize=100000';
      const result = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
        dataType: 'json',
      });

      assert(result.status === 413);
      const data = result.data;
      assert(data.message.includes('Request file too large'));
    });

    it('should file hit limits fileSize (byte)', async () => {
      const form = formstream();
      form.buffer('file', Buffer.alloc(1024 * 1024 * 100), 'foo.js');

      const headers = form.headers();
      const url = host + '/upload2';
      const result = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
        dataType: 'json',
      });

      assert(result.status === 413);
      const data = result.data;
      assert(data.message.includes('Request file too large'));
    });
  });

  describe('upload over fileSize limit', () => {
    let app: MockApplication;
    let server: any;
    let host: string;
    const bigfile = path.join(__dirname, 'big.js');
    before(async () => {
      app = mm.app({
        baseDir: 'apps/upload-limit',
      });
      await app.ready();
      await fs.writeFile(bigfile, Buffer.alloc(1024 * 1024 * 2));
      server = app.listen();
      host = 'http://127.0.0.1:' + server.address().port;
      await app.httpRequest().get('/upload').expect(200);
    });
    after(async () => {
      await fs.rm(bigfile, { force: true });
      server.close();
      await app.close();
    });
    beforeEach(() => app.mockCsrf());
    afterEach(mm.restore);

    it('should show error', async () => {
      const form = formstream();
      form.field('foo', 'bar').field('[', 'toString').field(']', 'toString');
      form.file('file', bigfile);

      const headers = form.headers();
      const url = host + '/upload';
      const res = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
        dataType: 'json',
      });

      const data = res.data;
      assert.equal(res.status, 413);
      assert(data.message.includes('Request file too large'));
      const content = await fs.readFile(app.coreLogger.options.file, 'utf-8');
      assert(content.includes('nodejs.MultipartFileTooLargeError: Request file too large'));
      // app.expectLog('nodejs.MultipartFileTooLargeError: Request file too large', 'coreLogger');
    });

    it('should ignore error when stream not handle error event', async () => {
      const form = formstream();
      form.field('foo', 'bar').field('[', 'toString').field(']', 'toString');
      form.file('file', bigfile, 'not-handle-error-event.js');

      const headers = form.headers();
      const url = host + '/upload';
      const res = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
        dataType: 'json',
      });

      const data = res.data;
      assert.equal(res.status, 200);
      assert(data.url);

      app.expectLog('nodejs.MultipartFileTooLargeError: Request file too large', 'coreLogger');
      app.expectLog(/filename: ['"]not-handle-error-event.js['"]/, 'coreLogger');
    });

    it('should ignore stream next errors after limit event fire', async () => {
      const form = formstream();
      form.field('foo', 'bar').field('[', 'toString').field(']', 'toString');
      form.file('file', bigfile, 'not-handle-error-event-and-mock-stream-error.js');

      const headers = form.headers();
      const url = host + '/upload';
      const res = await urllib.request(url, {
        method: 'POST',
        headers,
        stream: form as any,
        dataType: 'json',
      });

      const data = res.data;
      assert(res.status === 200);
      assert(data.url);

      app.expectLog('nodejs.MultipartFileTooLargeError: Request file too large', 'coreLogger');
      app.expectLog(/filename: ['"]not-handle-error-event-and-mock-stream-error.js['"]/, 'coreLogger');
    });
  });
});
