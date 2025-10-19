import path from 'node:path';

import { describe, it, afterAll, beforeAll, afterEach, expect } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';

describe('plugin/aop/test/aop.test.ts', () => {
  let app: MockApplication;

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: path.join(import.meta.dirname, 'fixtures/apps/aop-app'),
    });
    await app.ready();
  });

  it('module aop should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest().get('/aop').expect(200);
    expect(res.body).toEqual({
      msg: 'withCrossAroundResult(withPointAroundResult(hello withPointAroundParam(withCrosscutAroundParam(foo))))',
    });
  });

  it('module aop should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest().get('/singletonAop').expect(200);
    expect(res.body).toEqual({
      msg: 'withContextPointAroundResult(hello withContextPointAroundParam(foo))',
    });
  });
});
