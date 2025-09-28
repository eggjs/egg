import fs from 'node:fs/promises';

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import formstream from 'formstream';
import urllib from 'urllib';
import { mm, type MockApplication } from '@eggjs/mock';

import { getFixtures } from './utils.ts';

describe('test/file-mode-limit-filesize-per-request.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/limit-filesize-per-request'),
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

  it('should 200 when file size just 1mb on /upload-limit-1mb', async () => {
    const form = formstream();
    form.buffer('file', Buffer.alloc(1 * 1024 * 1024 - 1), '1mb.js', 'application/octet-stream');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload-limit-1mb', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    expect(res.status).toBe(200);
    const data = JSON.parse(res.data);
    // console.log(data);
    expect(data.files.length).toBe(1);
    expect(data.files[0].field).toBe('file');
    expect(data.files[0].filename).toBe('1mb.js');
    expect(data.files[0].encoding).toBe('7bit');
    expect(data.files[0].mime).toBe('application/octet-stream');
    expect(data.files[0].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);
    const stat = await fs.stat(data.files[0].filepath);
    expect(stat.size).toBe(1 * 1024 * 1024 - 1);
  });

  it('should 413 when file size > 1mb on /upload-limit-1mb', async () => {
    const form = formstream();
    form.buffer('file', Buffer.alloc(1 * 1024 * 1024 + 10), '1mb.js', 'application/octet-stream');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload-limit-1mb', {
      method: 'POST',
      headers,
      stream: form as any,
      dataType: 'json',
    });
    expect(res.status).toBe(413);
    expect(res.data.code).toBe('Request_fileSize_limit');
    expect(res.data.message).toBe('Reach fileSize limit');
  });

  it('should 200 when file size > 1mb /upload-limit-2mb', async () => {
    const form = formstream();
    form.buffer('file', Buffer.alloc(1 * 1024 * 1024 + 10), '2mb.js', 'application/octet-stream');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload-limit-2mb', {
      method: 'POST',
      headers,
      stream: form as any,
      dataType: 'json',
    });

    expect(res.status).toBe(200);
    // console.log(res.data);
    const data = res.data;
    expect(data.files.length).toBe(1);
    expect(data.files[0].field).toBe('file');
    expect(data.files[0].filename).toBe('2mb.js');
    expect(data.files[0].encoding).toBe('7bit');
    expect(data.files[0].mime).toBe('application/octet-stream');
    expect(data.files[0].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);
    const stat = await fs.stat(data.files[0].filepath);
    expect(stat.size).toBe(1 * 1024 * 1024 + 10);
  });

  it('should 413 when file size > 2mb on /upload-limit-2mb', async () => {
    const form = formstream();
    form.buffer('file', Buffer.alloc(2 * 1024 * 1024 + 10), '2mb.js', 'application/octet-stream');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload-limit-2mb', {
      method: 'POST',
      headers,
      stream: form as any,
      dataType: 'json',
    });

    expect(res.status).toBe(413);
    // console.log(res.data);
    expect(res.data.code).toBe('Request_fileSize_limit');
    expect(res.data.message).toBe('Reach fileSize limit');
  });

  it('should 400 when request is not multipart content type /upload-limit-2mb', async () => {
    const res = await urllib.request(host + '/upload-limit-2mb', {
      method: 'POST',
      data: {},
      dataType: 'json',
    });

    expect(res.status).toBe(400);
    expect(res.data.message).toBe('Content-Type must be multipart/*');
  });
});
