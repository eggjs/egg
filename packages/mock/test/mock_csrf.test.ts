import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import mm, { MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

describe('test/mock_csrf.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('demo'),
    });
    await app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  it.only('should pass', async () => {
    app.mockCsrf();
    await app.httpRequest()
      .post('/')
      .expect(200)
      .expect('done');
  });

  it('should 403 Forbidden', async () => {
    await app.httpRequest()
      .post('/')
      .expect(403)
      .expect(/ForbiddenError: missing csrf token/);
  });
});
