import fs from 'node:fs/promises';

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import formstream from 'formstream';
import urllib from 'urllib';
import { mm, type MockApplication } from '@eggjs/mock';
import { getFixtures } from './utils.ts';

const __filename = fileURLToPath(import.meta.url);

describe('test/stream-mode-with-filematch.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/fileModeMatch'),
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

  it('should upload match file mode', async () => {
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
    const res = await urllib.request(host + '/upload_file', {
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
    expect(data.files[1].filename).toBe('stream-mode-with-filematch.test.ts');
    expect(data.files[1].encoding).toBe('7bit');
    expect(data.files[1].mime).toBe('video/mp2t');
    expect(data.files[1].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);

    expect(data.files[2].field).toBe('bigfile');
    expect(data.files[2].filename).toBe('bigfile.txt');
    expect(data.files[2].encoding).toBe('7bit');
    expect(data.files[2].mime).toBe('text/plain');
    expect(data.files[2].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);
  });

  it('should upload not match file mode', async () => {
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
    expect(data).toEqual({ body: {} });
  });

  it('should allow to call saveRequestFiles on controller', async () => {
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
    const res = await urllib.request(host + '/save', {
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
    expect(data.files[1].filename).toBe('stream-mode-with-filematch.test.ts');
    expect(data.files[1].encoding).toBe('7bit');
    expect(data.files[1].mime).toBe('video/mp2t');
    expect(data.files[1].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);

    expect(data.files[2].field).toBe('bigfile');
    expect(data.files[2].filename).toBe('bigfile.txt');
    expect(data.files[2].encoding).toBe('7bit');
    expect(data.files[2].mime).toBe('text/plain');
    expect(data.files[2].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);
  });

  it('should 400 when request is not multipart', async () => {
    const res = await urllib.request(host + '/save', {
      method: 'POST',
      data: { foo: 'bar' },
      dataType: 'json',
    });
    expect(res.status).toBe(400);
    expect(res.data).toEqual({
      message: 'Content-Type must be multipart/*',
    });
  });

  it('should register clean_tmpdir schedule', async () => {
    // [egg-schedule]: register schedule /hello/egg-multipart/app/schedule/clean_tmpdir.js
    const logger = app.loggers.scheduleLogger;
    const content = await fs.readFile(logger.options.file, 'utf8');
    expect(content).toMatch(/\[@eggjs\/schedule\]: register schedule .+clean_tmpdir\.ts/);
  });
});
