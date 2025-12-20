import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

// TODO: flaky test on windows, Error: EPERM: operation not permitted
describe.skipIf(process.platform === 'win32')('test/mock_csrf.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('demo'),
    });
    await app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  it('should pass', async () => {
    app.mockCsrf();
    await app.httpRequest().post('/').expect(200).expect('done');
  });

  it('should 403 Forbidden', async () => {
    await app
      .httpRequest()
      .post('/')
      .expect(403)
      .expect(/ForbiddenError: missing csrf token/);
  });
});
