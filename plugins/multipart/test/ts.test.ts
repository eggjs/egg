import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';
import formstream from 'formstream';
import urllib from 'urllib';

import { getFixtures } from './utils.ts';

const __filename = fileURLToPath(import.meta.url);

describe('test/ts.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('apps/ts'),
    });
    return app.ready();
  });
  beforeAll(() => {
    server = app.listen();
    host = 'http://127.0.0.1:' + server.address().port;
  });
  afterAll(() => {
    return fs.rm(app.config.multipart.tmpdir, { force: true, recursive: true });
  });
  afterAll(() => app.close());
  afterAll(() => server.close());
  beforeEach(() => app.mockCsrf());
  afterEach(mm.restore);

  it('ts should run without err', async () => {
    const form = formstream();
    form.field('foo', 'bar').field('luckyscript', 'egg');
    form.file('file1', __filename, 'foooooooo.js');
    form.file('file2', __filename);
    // will ignore empty file
    form.buffer('file3', Buffer.from(''), '', 'application/octet-stream');
    form.file('bigfile', getFixtures('bigfile.txt'));
    // other form fields
    form.field('work', 'with Node.js');

    const headers = form.headers();
    const res = await urllib.request(host + '/', {
      method: 'POST',
      headers,
      stream: form as any,
    });

    expect(res.status).toBe(200);
    const data = JSON.parse(res.data);
    expect(data.body).toEqual({ foo: 'bar', luckyscript: 'egg', work: 'with Node.js' });
    expect(data.files.length).toBe(3);
    expect(data.files[0].field).toBe('file1');
    expect(data.files[0].filename).toBe('foooooooo.js');
    expect(data.files[0].encoding).toBe('7bit');
    expect(data.files[0].mime).toBe('application/javascript');
    expect(data.files[0].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);

    expect(data.files[1].field).toBe('file2');
    expect(data.files[1].filename).toBe('ts.test.ts');
    expect(data.files[1].encoding).toBe('7bit');
    expect(data.files[1].mime).toBe('video/mp2t');
    expect(data.files[1].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);

    expect(data.files[2].field).toBe('bigfile');
    expect(data.files[2].filename).toBe('bigfile.txt');
    expect(data.files[2].encoding).toBe('7bit');
    expect(data.files[2].mime).toBe('text/plain');
    expect(data.files[2].filepath.startsWith(app.config.multipart.tmpdir)).toBe(true);
  });
});
