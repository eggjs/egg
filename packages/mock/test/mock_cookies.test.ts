import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

describe('test/mock_cookies.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/mock_cookies'),
    });
    await app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  it("should not return when don't mock cookies", async () => {
    const ctx = app.mockContext();
    assert(!ctx.cookies.get('foo'));

    await app
      .httpRequest()
      .get('/')
      .expect(res => {
        assert.deepEqual(res.body, {});
      })
      .expect(200);
  });

  it('should mock cookies', async () => {
    app.mockCookies({
      foo: 'bar cookie',
    });

    await app
      .httpRequest()
      .get('/')
      .expect({
        cookieValue: 'bar cookie',
        cookiesValue: 'bar cookie',
      })
      .expect(200);
  });

  it('should pass cookie opt', async () => {
    app.mockCookies({});

    await app
      .httpRequest()
      .get('/')
      .set('cookie', 'foo=bar cookie')
      .expect({
        cookieValue: 'bar cookie',
        cookiesValue: 'bar cookie',
      })
      .expect(200);
  });
});
