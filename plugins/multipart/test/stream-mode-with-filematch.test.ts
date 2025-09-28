import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import formstream from 'formstream';
import urllib from 'urllib';
import { mm, MockApplication } from '@eggjs/mock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test/stream-mode-with-filematch.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  before(() => {
    app = mm.app({
      baseDir: 'apps/fileModeMatch',
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

  it('should upload match file mode', async () => {
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

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert.deepStrictEqual(data.body, { foo: 'fengmk2', love: 'egg', work: 'with Node.js' });
    assert(data.files.length === 3);
    assert(data.files[0].field === 'file1');
    assert(data.files[0].filename === 'foooooooo.js');
    assert(data.files[0].encoding === '7bit');
    assert(data.files[0].mime === 'application/javascript');
    assert(data.files[0].filepath.startsWith(app.config.multipart.tmpdir));

    assert(data.files[1].field === 'file2');
    assert(data.files[1].filename === 'stream-mode-with-filematch.test.ts');
    assert(data.files[1].encoding === '7bit');
    assert(data.files[1].mime === 'video/mp2t');
    assert(data.files[1].filepath.startsWith(app.config.multipart.tmpdir));

    assert(data.files[2].field === 'bigfile');
    assert(data.files[2].filename === 'bigfile.txt');
    assert(data.files[2].encoding === '7bit');
    assert(data.files[2].mime === 'application/javascript');
    assert(data.files[2].filepath.startsWith(app.config.multipart.tmpdir));
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

  it('should allow to call saveRequestFiles on controller', async () => {
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
    const res = await urllib.request(host + '/save', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    assert(res.status === 200);
    const data = JSON.parse(res.data);
    assert.deepStrictEqual(data.body, { foo: 'fengmk2', love: 'egg', work: 'with Node.js' });
    assert(data.files.length === 3);
    assert(data.files[0].field === 'file1');
    assert(data.files[0].filename === 'foooooooo.js');
    assert(data.files[0].encoding === '7bit');
    assert(data.files[0].mime === 'application/javascript');
    assert(data.files[0].filepath.startsWith(app.config.multipart.tmpdir));

    assert(data.files[1].field === 'file2');
    assert(data.files[1].filename === 'stream-mode-with-filematch.test.ts');
    assert(data.files[1].encoding === '7bit');
    assert(data.files[1].mime === 'video/mp2t');
    assert(data.files[1].filepath.startsWith(app.config.multipart.tmpdir));

    assert(data.files[2].field === 'bigfile');
    assert(data.files[2].filename === 'bigfile.txt');
    assert(data.files[2].encoding === '7bit');
    assert(data.files[2].mime === 'application/javascript');
    assert(data.files[2].filepath.startsWith(app.config.multipart.tmpdir));
  });

  it('should 400 when request is not multipart', async () => {
    const res = await urllib.request(host + '/save', {
      method: 'POST',
      data: { foo: 'bar' },
      dataType: 'json',
    });
    assert(res.status === 400);
    assert.deepStrictEqual(res.data, {
      message: 'Content-Type must be multipart/*',
    });
  });

  it('should register clean_tmpdir schedule', async () => {
    // [egg-schedule]: register schedule /hello/egg-multipart/app/schedule/clean_tmpdir.js
    const logger = app.loggers.scheduleLogger;
    const content = await fs.readFile(logger.options.file, 'utf8');
    assert.match(content, /\[@eggjs\/schedule\]: register schedule .+clean_tmpdir\.ts/);
  });
});
