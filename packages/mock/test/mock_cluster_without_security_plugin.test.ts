import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import mm, { MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

describe('test/mock_cluster_without_security_plugin.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.cluster({
      baseDir: getFixtures('disable-security'),
      coverage: false,
    });
    return app.ready();
  });
  afterAll(() => app.close());

  afterEach(mm.restore);

  it('should mock cluster work', () => {
    app.mockSession({
      user: {
        foo: 'bar',
      },
      hello: 'egg mock session data',
    });
    return app.httpRequest()
      .get('/session')
      .expect({
        user: {
          foo: 'bar',
        },
        hello: 'egg mock session data',
      });
  });
});
