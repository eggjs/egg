import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/plugin.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/plugin-test'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  it('should GET /', () => {
    return app
      .httpRequest()
      .get('/')
      .expect('x-trace-id', /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/)
      .expect('hi, egg')
      .expect(200);
  });
});
