import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/priority.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/controller-app'),
    });
    await app.ready();
  });

  afterAll(() => {
    return app.close();
  });

  it('/* should work', async () => {
    app.mockCsrf();
    await app.httpRequest().get('/view/foo').expect(200).expect('hello, view');
  });

  it('/users/group', async () => {
    app.mockCsrf();
    await app.httpRequest().get('/users/group').expect(200).expect('high priority');
  });

  it('/users/* should work', async () => {
    app.mockCsrf();
    await app.httpRequest().get('/users/foo').expect(200).expect('low priority');
  });
});
