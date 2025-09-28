import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import formstream from 'formstream';
import urllib from 'urllib';
import { mm, MockApplication } from '@eggjs/mock';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('test/multipart-for-await.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  before(async () => {
    app = mm.app({
      baseDir: 'apps/multipart-for-await',
    });
    await app.ready();
    server = app.listen();
    host = 'http://127.0.0.1:' + server.address().port;
  });
  after(() => app.close());
  after(() => server.close());
  beforeEach(() => app.mockCsrf());
  afterEach(mm.restore);

  it('should support for-await-of', async () => {
    const form = formstream();
    form.field('foo', 'bar');
    form.field('love', 'egg');
    form.file('file1', path.join(__dirname, 'fixtures/中文名.js'));
    form.file('file2', path.join(__dirname, 'fixtures/testfile.txt'));
    // will ignore empty file
    form.buffer('file3', Buffer.from(''), '', 'application/octet-stream');

    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers: form.headers(),
      stream: form as any,
      dataType: 'json',
    });

    const data = res.data;
    // console.log(data);
    assert.equal(data.fields.foo, 'bar');
    assert.equal(data.fields.love, 'egg');
    assert.equal(data.files.file1.fileName, '中文名.js');
    assert(data.files.file1.content.includes('hello'));
    assert.equal(data.files.file2.fileName, 'testfile.txt');
    assert(data.files.file2.content.includes('this is a test file'));
    assert(!data.files.file3);
  });

  it('should auto consumed file stream on error throw', async () => {
    const form = formstream();
    form.field('foo', 'bar');
    form.field('love', 'egg');
    form.file('file2', path.join(__dirname, 'fixtures/testfile.txt'));

    const res = await urllib.request(host + '/upload?mock_error=true', {
      method: 'POST',
      headers: form.headers(),
      stream: form as any,
      dataType: 'json',
    });

    assert.equal(res.data.message, 'mock error');
  });

  describe('should throw when limit', () => {
    it('limit fileSize', async () => {
      const form = formstream();
      form.field('foo', 'bar');
      form.field('love', 'egg');
      form.file('file1', path.join(__dirname, 'fixtures/中文名.js'));
      form.file('file2', path.join(__dirname, 'fixtures/bigfile.txt'));

      const res = await urllib.request(host + '/upload', {
        method: 'POST',
        headers: form.headers(),
        stream: form as any,
        dataType: 'json',
      });

      const { data, status } = res;
      assert.equal(status, 413);
      assert.equal(data.message, 'Reach fileSize limit');
    });

    it('limit fileSize very small so limit event is miss', async () => {
      const form = formstream();
      form.field('foo', 'bar');
      form.field('love', 'egg');
      form.file('file2', path.join(__dirname, 'fixtures/bigfile.txt'));

      const res = await urllib.request(host + '/upload?fileSize=10', {
        method: 'POST',
        headers: form.headers(),
        stream: form as any,
        dataType: 'json',
      });

      const { data, status } = res;
      assert.equal(status, 413);
      assert.equal(data.message, 'Reach fileSize limit');
    });

    it('limit fieldSize', async () => {
      const form = formstream();
      form.field('foo', 'bar');
      form.field('love', 'eggaaaaaaaaaaaaa');
      form.file('file1', path.join(__dirname, 'fixtures/中文名.js'));
      form.file('file2', path.join(__dirname, 'fixtures/testfile.txt'));

      const res = await urllib.request(host + '/upload', {
        method: 'POST',
        headers: form.headers(),
        stream: form as any,
        dataType: 'json',
      });

      const { data, status } = res;
      assert.equal(status, 413);
      assert.equal(data.message, 'Reach fieldSize limit');
    });

    // TODO: still not support at busboy 1.x (only support at urlencoded)
    // https://github.com/mscdex/busboy/blob/v0.3.1/lib/types/multipart.js#L5
    // https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js#L251
    it.skip('limit fieldNameSize', async () => {
      const form = formstream();
      form.field('fooaaaaaaaaaaaaaaa', 'bar');
      form.field('love', 'egg');
      form.file('file1', path.join(__dirname, 'fixtures/中文名.js'));
      form.file('file2', path.join(__dirname, 'fixtures/testfile.txt'));

      const res = await urllib.request(host + '/upload', {
        method: 'POST',
        headers: form.headers(),
        stream: form as any,
        dataType: 'json',
      });

      const { data, status } = res;
      assert.equal(status, 413);
      assert.equal(data.message, 'Reach fieldNameSize limit');
    });
  });
});
