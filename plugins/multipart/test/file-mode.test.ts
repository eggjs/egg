import path from 'node:path';
import fs from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { mm, mock, type MockApplication } from '@eggjs/mock';
import dayjs from 'dayjs';
import formstream from 'formstream';
import urllib from 'urllib';

import { getFixtures } from './utils.ts';

const __filename = fileURLToPath(import.meta.url);

describe('test/file-mode.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/file-mode'),
    });
    await app.ready();
  });
  beforeAll(() => {
    server = app.listen();
    host = 'http://127.0.0.1:' + server.address().port;
  });
  afterAll(async () => {
    await fs.rm(app.config.multipart.tmpdir, { force: true, recursive: true });
  });
  afterAll(() => app.close());
  afterAll(() => server.close());
  beforeEach(() => app.mockCsrf());
  afterEach(mm.restore);

  it('should ignore non multipart request', async () => {
    const res = await app.httpRequest().post('/upload').send({
      foo: 'bar',
      n: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
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
    form.file('bigfile', getFixtures('bigfile.txt'));
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    expect(res.status).toBe(200);
    const data = JSON.parse(res.data);
    expect(data.body).toEqual({ foo: 'fengmk2', love: 'egg', work: 'with Node.js' });
    expect(data.files.length).toBe(3);
    expect(data.files[0].field).toBe('file1');
    expect(data.files[0].filename).toBe('foooooooo.js');
    expect(data.files[0].encoding).toBe('7bit');
    expect(data.files[0].mime).toBe('application/javascript');
    expect(data.files[0].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);

    expect(data.files[1].field).toBe('file2');
    expect(data.files[1].fieldname).toBe('file2');
    expect(data.files[1].filename).toBe('file-mode.test.ts');
    expect(data.files[1].encoding).toBe('7bit');
    expect(data.files[1].transferEncoding).toBe('7bit');
    expect(data.files[1].mime).toBe('video/mp2t');
    expect(data.files[1].mimeType).toBe('video/mp2t');
    expect(data.files[1].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);

    expect(data.files[2].field).toBe('bigfile');
    expect(data.files[2].filename).toBe('bigfile.txt');
    expect(data.files[2].encoding).toBe('7bit');
    expect(data.files[2].mime).toBe('text/plain');
    expect(data.files[2].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);
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
    expect(res.status).toBe(200);
    const data = JSON.parse(res.data);
    expect(data.files.length).toBe(1);
    expect(data.files[0].field).toBe('file');
    expect(data.files[0].filename).toBe('10mb.js');
    expect(data.files[0].encoding).toBe('7bit');
    expect(data.files[0].mime).toBe('application/octet-stream');
    expect(data.files[0].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);
    const stat = await fs.stat(data.files[0].filepath);
    expect(stat.size).toBe(10 * 1024 * 1024 - 1);
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

    expect(res.status).toBe(200);
    const data = JSON.parse(res.data);
    expect(data.body.foo).toBe('a'.repeat(100 * 1024 - 1));
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

    expect(res.status).toBe(200);
    const data = JSON.parse(res.data);
    expect(Object.keys(data.body).length).toBe(10);
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

    expect(res.status).toBe(200);
    const data = JSON.parse(res.data);
    expect(data.files.length).toBe(10);
  });

  it('should handle non-ascii filename', async () => {
    const file = getFixtures('中文名.js');
    const res = await app.httpRequest().post('/upload').attach('file', file);
    expect(res.status).toBe(200);
    expect(res.body.files[0].filename).toBe('中文名.js');
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

    expect(res.status).toBe(413);
    expect(res.data.toString()).toMatch(/Error: Reach fields limit/);
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

    expect(res.status).toBe(413);
    expect(res.data.toString()).toMatch(/Error: Reach files limit/);
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

    expect(res.status).toBe(413);
    expect(res.data.toString()).toMatch(/Error: Reach fieldSize limit/);
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

    expect(res.status).toBe(413);
    expect(res.data.toString()).toMatch(/Error: Reach fieldSize limit/);
  });

  it('should throw error when request file size limit', async () => {
    const form = formstream();
    form.field('foo', 'fengmk2').field('love', 'egg');
    form.file('file1', __filename, 'foooooooo.js');
    form.file('file2', __filename);
    form.buffer('file3', Buffer.alloc(10 * 1024 * 1024 + 1), 'toobigfile.txt', 'application/octet-stream');
    form.file('bigfile', getFixtures('bigfile.txt'));
    // other form fields
    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    expect(res.status).toBe(413);
    expect(res.data.toString()).toMatch(/Error: Reach fileSize limit/);
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

    expect(res.status).toBe(400);
    expect(res.data.toString()).toMatch(/Error: Invalid filename: foooooooo.js.rar/);
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

    expect(res.status).toBe(500);
    expect(res.data.toString()).toMatch(/the multipart request can't be consumed twice/);
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

    expect(res.status).toBe(200);
    const data = JSON.parse(res.data);
    expect(data.files.length).toBe(1);
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

    expect(res.status).toBe(200);
    const data = JSON.parse(res.data);
    expect(data.files.length).toBe(1);
  });

  describe('schedule/clean_tmpdir', () => {
    it('should register clean_tmpdir schedule', async () => {
      // [egg-schedule]: register schedule /hello/egg-multipart/app/schedule/clean_tmpdir.js
      const logger = app.loggers.scheduleLogger;
      const content = await fs.readFile(logger.options.file, 'utf8');
      expect(content).toMatch(/\[@eggjs\/schedule\]: register schedule .+clean_tmpdir\.ts/);
    });

    it('should remove nothing', async () => {
      app.mockLog();
      await app.runSchedule(path.join(import.meta.dirname, '../src/app/schedule/clean_tmpdir'));
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
      await app.runSchedule(path.join(import.meta.dirname, '../src/app/schedule/clean_tmpdir'));
      for (const dir of oldDirs) {
        const exists = await fs
          .access(dir)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(false);
      }
      for (const dir of shouldKeepDirs) {
        const exists = await fs
          .access(dir)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
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
    expect(res.data.body).toEqual({ foo: 'egg' });
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
    expect(res.data.body).toEqual({ foo: ['fengmk2', 'like', 'egg'] });
  });
});
