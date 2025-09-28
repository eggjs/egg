import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import formstream from 'formstream';
import urllib from 'urllib';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/dynamic-option.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  before(() => {
    app = mm.app({
      baseDir: 'apps/dynamic-option',
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
  afterEach(() => mm.restore());

  it('should work with saveRequestFiles options', async () => {
    const form = formstream();
    form.buffer('file', Buffer.alloc(1 * 1024 * 1024), '1mb.js', 'application/octet-stream');

    const headers = form.headers();
    const res = await urllib.request(host + '/upload', {
      method: 'POST',
      headers,
      stream: form as any,
      // dataType: 'json',
    });

    assert.equal(res.status, 413);
    assert.match(res.data.toString(), /Error: Reach fileSize limit/);
  });
});
