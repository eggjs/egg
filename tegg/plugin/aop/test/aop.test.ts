import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, afterEach, expect } from 'vitest';

describe('plugin/aop/test/aop.test.ts', () => {
  let app: MockApplication;

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  // App boot exceeds the 10s vitest default on slow Windows runners; the tegg
  // projects do not inherit the root config's 20s hookTimeout, so state it
  // explicitly with the same value.
  beforeAll(async () => {
    app = mm.app({
      baseDir: path.join(import.meta.dirname, 'fixtures/apps/aop-app'),
    });
    await app.ready();
  }, 20_000);

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

  it('cross-loadUnit module aop should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest().get('/crossModuleAop').expect(200);
    expect(res.body).toEqual({
      msg: 'withCrossModuleResult(helloCross withCrossModuleParam(foo))',
    });
  });
});
