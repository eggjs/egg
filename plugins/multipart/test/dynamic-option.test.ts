import fs from 'node:fs/promises';

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import formstream from 'formstream';
import urllib from 'urllib';
import { mm, type MockApplication } from '@eggjs/mock';

import { getFixtures } from './utils.ts';

describe('test/dynamic-option.test.ts', () => {
  let app: MockApplication;
  let server: any;
  let host: string;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/dynamic-option'),
    });
    await app.ready();
    server = app.listen();
    host = 'http://127.0.0.1:' + server.address().port;
  });

  afterAll(async () => {
    await fs.rm(app.config.multipart.tmpdir, { force: true, recursive: true });
  });
  afterAll(() => app.close());
  afterAll(() => server.close());
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

    expect(res.status).toBe(413);
    expect(res.data.toString()).toMatch(/LimitError: Reach fileSize limit/);
  });
});
