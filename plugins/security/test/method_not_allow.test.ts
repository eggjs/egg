import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/method_not_allow.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/method'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  it('should allow', async () => {
    await app.httpRequest().get('/').expect(200);
  });

  it('should not allow trace method', async () => {
    await app.httpRequest().trace('/').set('accept', 'text/html').expect(405);
  });

  it('should allow options method', () => {
    return app.httpRequest().options('/').set('accept', 'text/html').expect(200);
  });
});
