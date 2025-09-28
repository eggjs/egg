import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { mm, mock, MockApplication } from '@eggjs/mock';
import dayjs from 'dayjs';
import formstream from 'formstream';
import urllib from 'urllib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test/file-mode.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  before(() => {
    app = mm.app({
      baseDir: 'apps/file-mode',
    });
    return app.ready();
  });
  before(() => {
    server = app.listen();
    host = 'http://127.0.0.1:' + server.address().port;
  });
  after(() => {
    return fs.rm(app.config.multipart.tmpdir, { force: true, recursive: true });
  });
  after(() => app.close());
  after(() => server.close());
  beforeEach(() => app.mockCsrf());
  afterEach(mm.restore);

  it('should ignore non multipart request', async () => {
    const res = await app.httpRequest().post('/upload').send({
      foo: 'bar',
      n: 1,
    });
    assert(res.status === 200);
    assert.deepStrictEqual(res.body, {
      body: {
        foo: 'bar',
        n: 1,
      },
    });
  });

  it('should upload', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file1', __filename, 'foooooooo.js');
    form.file('file2', __filename);
    // will ignore empty file
    form.buffer('file3', Buffer.from(''), '', 'application/octet-stream');
    form.file('bigfile', path.join(__dirname, 'fixtures', 'bigfile.txt'));
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert.deepStrictEqual(data.body, { foo: 'fengmk2', love: 'egg', work: 'with Node.js' });
    assert(data.files.length === 3);
    assert(data.files[0].field === 'file1');
    assert.equal(data.files[0].filename, 'foooooooo.js');
    assert(data.files[0].encoding === '7bit');
    assert(data.files[0].mime === 'application/javascript');
    assert(data.files[0].filepath.startsWith(app.config.multipart.tmpdir));

    assert(data.files[1].field === 'file2');
    assert(data.files[1].fieldname === 'file2');
    assert.equal(data.files[1].filename, 'file-mode.test.ts');
    assert(data.files[1].encoding === '7bit');
    assert(data.files[1].transferEncoding === '7bit');
    assert.equal(data.files[1].mime, 'video/mp2t');
    assert.equal(data.files[1].mimeType, 'video/mp2t');
    assert(data.files[1].filepath.startsWith(app.config.multipart.tmpdir));

    assert(data.files[2].field === 'bigfile');
    assert.equal(data.files[2].filename, 'bigfile.txt');
    assert(data.files[2].encoding === '7bit');
    assert.equal(data.files[2].mime, 'application/javascript');
    assert(data.files[2].filepath.startsWith(app.config.multipart.tmpdir));
  });

  it('should 200 when file size just 10mb', async () => {
    const form = formstream();
    form.buffer('file', Buffer.alloc(10 * 1024 * 1024 - 1), '10mb.js', 'application/octet-stream');
    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });
    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert.equal(data.files.length, 1);
    assert.equal(data.files[0].field, 'file');
    assert.equal(data.files[0].filename, '10mb.js');
    assert.equal(data.files[0].encoding, '7bit');
    assert.equal(data.files[0].mime, 'application/octet-stream');
    assert(data.files[0].filepath.startsWith(app.config.multipart.tmpdir));
    const stat = await fs.stat(data.files[0].filepath);
    assert.equal(stat.size, 10 * 1024 * 1024 - 1);
  });

  it('should 200 when field size just 100kb', async () => {
    const form = formstream();
    form.field('foo', 'a'.repeat(100 * 1024 - 1));

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert(data.body.foo === 'a'.repeat(100 * 1024 - 1));
  });

  it('should 200 when request fields equal 10', async () => {
    const form = formstream();
    for (let i = 0; i < 10; i++) {
      form.field('foo' + i, 'a' + i);
    }

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert(Object.keys(data.body).length === 10);
  });

  it('should 200 when request files equal 10', async () => {
    const form = formstream();
    for (let i = 0; i < 10; i++) {
      form.file('foo' + i, __filename);
    }

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert(data.files.length === 10);
  });

  it('should handle non-ascii filename', async () => {
    const file = path.join(__dirname, 'fixtures', '中文名.js');
    const res = await app.httpRequest().post('/upload').attach('file', file);
    assert(res.status === 200);
    assert(res.body.files[0].filename === '中文名.js');
  });

  it('should throw error when request fields limit', async () => {
    const form = formstream();
    for (let i = 0; i < 11; i++) {
      form.field('foo' + i, 'a' + i);
    }

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 413);
    assert.match(res.data.toString(), /Error: Reach fields limit/);
  });

  it('should throw error when request files limit', async () => {
    const form = formstream();
    form.setMaxListeners(11);
    for (let i = 0; i < 11; i++) {
      form.file('foo' + i, __filename);
    }

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 413);
    assert.match(res.data.toString(), /Error: Reach files limit/);
  });

  it('should throw error when request field size limit', async () => {
    const form = formstream();
    form.field('foo', 'a'.repeat(100 * 1024 + 1));

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 413);
    assert.match(res.data.toString(), /Error: Reach fieldSize limit/);
  });

  // fieldNameSize is TODO on busboy
  // see https://github.com/mscdex/busboy/blob/v0.3.1/lib/types/multipart.js#L5
  it.skip('should throw error when request field name size limit', async () => {
    const form = formstream();
    form.field('b'.repeat(101), 'a');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 413);
    assert.match(res.data.toString(), /Error: Reach fieldSize limit/);
  });

  it('should throw error when request file size limit', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file1', __filename, 'foooooooo.js');
    form.file('file2', __filename);
    form.buffer('file3', Buffer.alloc(10 * 1024 * 1024 + 1), 'toobigfile.txt', 'application/octet-stream');
    form.file('bigfile', path.join(__dirname, 'fixtures', 'bigfile.txt'));
    // other form fields
    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 413);
    assert.match(res.data.toString(), /Error: Reach fileSize limit/);
  });

  it('should throw error when file name invalid', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file1', __filename, 'foooooooo.js.rar');
    form.file('file2', __filename);
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 400);
    assert(res.data.toString().includes('Error: Invalid filename: foooooooo.js.rar'));
  });

  it('should throw error on multipart() invoke twice', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file2', __filename);
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload?call_multipart_twice=1', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert.equal(res.status, 500);
    assert(res.data.toString().includes("the multipart request can't be consumed twice"));
  });

  it('should use cleanupRequestFiles after request end', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file2', __filename);
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload?cleanup=true', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert(data.files.length === 1);
  });

  it('should use cleanupRequestFiles in async way', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file2', __filename);
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload?async_cleanup=true', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert(data.files.length === 1);
  });

  describe('schedule/clean_tmpdir', () => {
    it('should register clean_tmpdir schedule', async () => {
      // [egg-schedule]: register schedule /hello/egg-multipart/app/schedule/clean_tmpdir.js
      const logger = app.loggers.scheduleLogger;
      const content = await fs.readFile(logger.options.file, 'utf8');
      assert.match(content, /\[@eggjs\/schedule\]: register schedule .+clean_tmpdir\.ts/);
    });

    it('should remove nothing', async () => {
      app.mockLog();
      await app.runSchedule(path.join(__dirname, '../src/app/schedule/clean_tmpdir'));
      await scheduler.wait(1000);
      app.expectLog('[@eggjs/multipart:CleanTmpdir] start clean tmpdir: "', 'coreLogger');
      app.expectLog('[@eggjs/multipart:CleanTmpdir] end', 'coreLogger');
    });

    it('should remove old dirs', async () => {
      const oldDirs = [
        path.join(app.config.multipart.tmpdir, dayjs().subtract(1, 'years').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, dayjs().subtract(1, 'months').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, dayjs().subtract(2, 'months').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, dayjs().subtract(3, 'months').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, dayjs().subtract(1, 'days').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, dayjs().subtract(7, 'days').format('YYYY/MM/DD/HH')),
      ];
      const shouldKeepDirs = [
        path.join(app.config.multipart.tmpdir, dayjs().subtract(2, 'years').format('YYYY/MM/DD/HH')),
        path.join(app.config.multipart.tmpdir, dayjs().format('YYYY/MM/DD/HH')),
      ];
      const currentMonth = new Date().getMonth();
      const fourMonthBefore = path.join(
        app.config.multipart.tmpdir,
        dayjs().subtract(4, 'months').format('YYYY/MM/DD/HH')
      );
      if (currentMonth < 4) {
        // if current month is less than April, four months before should be last year.
        oldDirs.push(fourMonthBefore);
      } else {
        shouldKeepDirs.push(fourMonthBefore);
      }
      await Promise.all(oldDirs.map(dir => fs.mkdir(dir, { recursive: true })));
      await Promise.all(shouldKeepDirs.map(dir => fs.mkdir(dir, { recursive: true })));

      await Promise.all(
        oldDirs.map(dir => {
          // create files
          return fs.writeFile(path.join(dir, Date.now() + ''), Date());
        })
      );

      app.mockLog();
      await app.runSchedule(path.join(__dirname, '../src/app/schedule/clean_tmpdir'));
      for (const dir of oldDirs) {
        const exists = await fs
          .access(dir)
          .then(() => true)
          .catch(() => false);
        assert(!exists, dir);
      }
      for (const dir of shouldKeepDirs) {
        const exists = await fs
          .access(dir)
          .then(() => true)
          .catch(() => false);
        assert(exists, dir);
      }
      app.expectLog('[@eggjs/multipart:CleanTmpdir] removing tmpdir: "', 'coreLogger');
      app.expectLog('[@eggjs/multipart:CleanTmpdir:success] tmpdir: "', 'coreLogger');
    });
  });

  it('should keep last field', async () => {
    mock(app.config.multipart, 'allowArrayField', false);
    const form = formstream();
    form.field('foo', 'fengmk2').field('foo', 'egg');
    form.file('file2', __filename);

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
      dataType: 'json',
    });
    assert.deepStrictEqual(res.data.body, { foo: 'egg' });
  });

  it('should allow array field', async () => {
    mock(app.config.multipart, 'allowArrayField', true);
    const form = formstream();
    form.field('foo', 'fengmk2').field('foo', 'like').field('foo', 'egg');
    form.file('file2', __filename);

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
      dataType: 'json',
    });
    assert.deepStrictEqual(res.data.body, { foo: ['fengmk2', 'like', 'egg'] });
  });
});
