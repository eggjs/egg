import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import formstream from 'formstream';
import urllib from 'urllib';
import { mm, type MockApplication } from '@eggjs/mock';

import { getFixtures } from './utils.ts';

describe('test/multipart-for-await.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/multipart-for-await'),
    });
    await app.ready();
    server = app.listen();
    host = 'http://127.0.0.1:' + server.address().port;
  });
  afterAll(() => app.close());
  afterAll(() => server.close());
  beforeEach(() => app.mockCsrf());
  afterEach(mm.restore);

  it('should support for-await-of', async () => {
    const form = formstream();
    form.field('foo', 'bar');
    form.field('love', 'egg');
    form.file('file1', getFixtures('中文名.js'));
    form.file('file2', getFixtures('testfile.txt'));
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
    expect(data.fields.foo).toBe('bar');
    expect(data.fields.love).toBe('egg');
    expect(data.files.file1.fileName).toBe('中文名.js');
    expect(data.files.file1.content).toContain('hello');
    expect(data.files.file2.fileName).toBe('testfile.txt');
    expect(data.files.file2.content).toContain('this is a test file');
    expect(data.files.file3).toBeUndefined();
  });

  it('should auto consumed file stream on error throw', async () => {
    const form = formstream();
    form.field('foo', 'bar');
    form.field('love', 'egg');
    form.file('file2', getFixtures('testfile.txt'));

    const res = await urllib.request(host + '/upload?mock_error=true', {
      method: 'POST',
      headers: form.headers(),
      stream: form as any,
      dataType: 'json',
    });

    expect(res.data.message).toBe('mock error');
  });

  describe('should throw when limit', () => {
    it('limit fileSize', async () => {
      const form = formstream();
      form.field('foo', 'bar');
      form.field('love', 'egg');
      form.file('file1', getFixtures('中文名.js'));
      form.file('file2', getFixtures('bigfile.txt'));

      const res = await urllib.request(host + '/upload', {
        method: 'POST',
        headers: form.headers(),
        stream: form as any,
        dataType: 'json',
      });

      const { data, status } = res;
      expect(status).toBe(413);
      expect(data.message).toBe('Reach fileSize limit');
    });

    it('limit fileSize very small so limit event is miss', async () => {
      const form = formstream();
      form.field('foo', 'bar');
      form.field('love', 'egg');
      form.file('file2', getFixtures('bigfile.txt'));

      const res = await urllib.request(host + '/upload?fileSize=10', {
        method: 'POST',
        headers: form.headers(),
        stream: form as any,
        dataType: 'json',
      });

      const { data, status } = res;
      expect(status).toBe(413);
      expect(data.message).toBe('Reach fileSize limit');
    });

    it('limit fieldSize', async () => {
      const form = formstream();
      form.field('foo', 'bar');
      form.field('love', 'eggaaaaaaaaaaaaa');
      form.file('file1', getFixtures('中文名.js'));
      form.file('file2', getFixtures('testfile.txt'));

      const res = await urllib.request(host + '/upload', {
        method: 'POST',
        headers: form.headers(),
        stream: form as any,
        dataType: 'json',
      });

      const { data, status } = res;
      expect(status).toBe(413);
      expect(data.message).toBe('Reach fieldSize limit');
    });

    // TODO: still not support at busboy 1.x (only support at urlencoded)
    // https://github.com/mscdex/busboy/blob/v0.3.1/lib/types/multipart.js#L5
    // https://github.com/mscdex/busboy/blob/master/lib/types/multipart.js#L251
    it.skip('limit fieldNameSize', async () => {
      const form = formstream();
      form.field('fooaaaaaaaaaaaaaaa', 'bar');
      form.field('love', 'egg');
      form.file('file1', getFixtures('中文名.js'));
      form.file('file2', getFixtures('testfile.txt'));

      const res = await urllib.request(host + '/upload', {
        method: 'POST',
        headers: form.headers(),
        stream: form as any,
        dataType: 'json',
      });

      const { data, status } = res;
      expect(status).toBe(413);
      expect(data.message).toBe('Reach fieldNameSize limit');
    });
  });
});
