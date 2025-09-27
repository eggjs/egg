import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/noopen.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/noopen'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  it('should return default download noopen http header', () => {
    return app.httpRequest().get('/').set('accept', 'text/html').expect('X-Download-Options', 'noopen').expect(200);
  });

  it('should not return download noopen http header', async () => {
    const res = await app.httpRequest().get('/disable').set('accept', 'text/html').expect(200);
    expect(res.headers['x-download-options']).toBeUndefined();
  });
});
