import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { mm, MockApplication } from '@eggjs/mock';
import formstream from 'formstream';
import urllib from 'urllib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test/stream-mode-with-filematch-glob.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  before(() => {
    app = mm.app({
      baseDir: 'apps/fileModeMatch-glob',
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

  it('should upload match file mode work on /upload_file', async () => {
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
    const res = await urllib.request(host + '/upload_file', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert.equal(res.status, 200);
    const data = JSON.parse(res.data);
    assert.deepStrictEqual(data.body, { foo: 'fengmk2', love: 'egg', work: 'with Node.js' });
    assert.equal(data.files.length, 3);
    assert.equal(data.files[0].field, 'file1');
    assert.equal(data.files[0].filename, 'foooooooo.js');
    assert.equal(data.files[0].encoding, '7bit');
    assert.equal(data.files[0].mime, 'application/javascript');
    assert.ok(data.files[0].filepath.startsWith(app.config.multipart.tmpdir));

    assert.equal(data.files[1].field, 'file2');
    assert.equal(data.files[1].filename, 'stream-mode-with-filematch-glob.test.ts');
    assert.equal(data.files[1].encoding, '7bit');
    assert.equal(data.files[1].mime, 'video/mp2t');
    assert.ok(data.files[1].filepath.startsWith(app.config.multipart.tmpdir));

    assert.equal(data.files[2].field, 'bigfile');
    assert.equal(data.files[2].filename, 'bigfile.txt');
    assert.equal(data.files[2].encoding, '7bit');
    assert.equal(data.files[2].mime, 'application/javascript');
    assert.ok(data.files[2].filepath.startsWith(app.config.multipart.tmpdir));
  });

  it('should upload match file mode work on /upload_file/*', async () => {
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
    const res = await urllib.request(host + '/upload_file/foo', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert.equal(res.status, 200);
    const data = JSON.parse(res.data);
    assert.deepStrictEqual(data.body, { foo: 'fengmk2', love: 'egg', work: 'with Node.js' });
    assert.equal(data.files.length, 3);
    assert.equal(data.files[0].field, 'file1');
    assert.equal(data.files[0].filename, 'foooooooo.js');
    assert.equal(data.files[0].encoding, '7bit');
    assert.equal(data.files[0].mime, 'application/javascript');
    assert.ok(data.files[0].filepath.startsWith(app.config.multipart.tmpdir));

    assert.equal(data.files[1].field, 'file2');
    assert.equal(data.files[1].filename, 'stream-mode-with-filematch-glob.test.ts');
    assert.equal(data.files[1].encoding, '7bit');
    assert.equal(data.files[1].mime, 'video/mp2t');
    assert.ok(data.files[1].filepath.startsWith(app.config.multipart.tmpdir));

    assert.equal(data.files[2].field, 'bigfile');
    assert.equal(data.files[2].filename, 'bigfile.txt');
    assert.equal(data.files[2].encoding, '7bit');
    assert.equal(data.files[2].mime, 'application/javascript');
    assert.ok(data.files[2].filepath.startsWith(app.config.multipart.tmpdir));
  });

  it('should upload not match file mode', async () => {
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
    assert.deepStrictEqual(data, { body: {} });
  });
});
