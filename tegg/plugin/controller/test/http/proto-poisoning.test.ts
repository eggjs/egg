import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, beforeAll, afterAll, expect } from 'vite-plus/test';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/proto-poisoning.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/proto-poisoning'),
    });
    await app.ready();
  });

  afterAll(() => {
    return app.close();
  });

  it('should protect proto poisoning', async () => {
    app.mockCsrf();
    const res = await app
      .httpRequest()
      .post('/hello-proto-poisoning')
      .set('content-type', 'application/json')
      .send(`{
        "hello": "world",
        "__proto__": { "boom": "💣" }
      }`)
      .expect(200);
    console.log(res.body);
    expect(res.body['body.boom']).toBeUndefined();
    expect(res.body['params2.boom']).toBeUndefined();
    expect(res.body['params1.boom']).toBeUndefined();
  });
});
