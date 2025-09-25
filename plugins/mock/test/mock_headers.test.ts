import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { request } from '@eggjs/supertest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

describe('test/mock_headers.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('demo'),
    });
    return app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  it('should not exists without mock', async () => {
    app.mockContext();

    await request(app.callback())
      .get('/header')
      .expect(res => {
        assert.equal(res.body.header, '');
      })
      .expect(200);
  });

  it('should mock headers', async () => {
    app.mockContext();
    app.mockHeaders({
      customheader: 'customheader',
    });
    await request(app.callback())
      .get('/header')
      .expect(res => {
        assert.equal(res.body.header, 'customheader');
      })
      .expect(200);
  });

  it('should mock headers that is uppercase', async () => {
    app.mockContext();
    app.mockHeaders({
      Customheader: 'customheader',
    });
    await request(app.callback())
      .get('/header')
      .expect(res => {
        assert.equal(res.body.header, 'customheader');
      })
      .expect(200);
  });
});
