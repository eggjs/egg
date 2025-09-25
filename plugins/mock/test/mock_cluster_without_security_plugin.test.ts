import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

describe('test/mock_cluster_without_security_plugin.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({
      baseDir: getFixtures('disable-security'),
      coverage: false,
    });
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
  });

  afterEach(mm.restore);

  it('should mock cluster work', async () => {
    app.mockSession({
      user: {
        foo: 'bar',
      },
      hello: 'egg mock session data',
    });
    await app
      .httpRequest()
      .get('/session')
      .expect({
        user: {
          foo: 'bar',
        },
        hello: 'egg mock session data',
      });
  });
});
