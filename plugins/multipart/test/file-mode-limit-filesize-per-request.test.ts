import assert from 'node:assert';
import fs from 'node:fs/promises';
import formstream from 'formstream';
import urllib from 'urllib';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/file-mode-limit-filesize-per-request.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  before(() => {
    app = mm.app({
      baseDir: 'apps/limit-filesize-per-request',
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

  it('should 200 when file size just 1mb on /upload-limit-1mb', async () => {
    const form = formstream();
    form.buffer('file', Buffer.alloc(1 * 1024 * 1024 - 1), '1mb.js', 'application/octet-stream');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload-limit-1mb', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    // console.log(data);
    assert(data.files.length === 1);
    assert(data.files[0].field === 'file');
    assert(data.files[0].filename === '1mb.js');
    assert(data.files[0].encoding === '7bit');
    assert(data.files[0].mime === 'application/octet-stream');
    assert(data.files[0].filepath.startsWith(app.config.multipart.tmpdir));
    const stat = await fs.stat(data.files[0].filepath);
    assert(stat.size === 1 * 1024 * 1024 - 1);
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
    assert(res.status === 413);
    assert(res.data.code === 'Request_fileSize_limit');
    assert(res.data.message === 'Reach fileSize limit');
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

    assert(res.status === 200);
    // console.log(res.data);
    const data = res.data;
    assert(data.files.length === 1);
    assert(data.files[0].field === 'file');
    assert(data.files[0].filename === '2mb.js');
    assert(data.files[0].encoding === '7bit');
    assert(data.files[0].mime === 'application/octet-stream');
    assert(data.files[0].filepath.startsWith(app.config.multipart.tmpdir));
    const stat = await fs.stat(data.files[0].filepath);
    assert(stat.size === 1 * 1024 * 1024 + 10);
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

    assert(res.status === 413);
    // console.log(res.data);
    assert(res.data.code === 'Request_fileSize_limit');
    assert(res.data.message === 'Reach fileSize limit');
  });

  it('should 400 when request is not multipart content type /upload-limit-2mb', async () => {
    const res = await urllib.request(host + '/upload-limit-2mb', {
      method: 'POST',
      data: {},
      dataType: 'json',
    });

    assert(res.status === 400);
    assert(res.data.message === 'Content-Type must be multipart/*');
  });
});
