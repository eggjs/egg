import { describe, it, afterEach, beforeAll, afterAll, expect } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/module.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    delete (global as any).constructAppService;
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/module-app'),
    });
    await app.ready();
  });

  afterAll(() => {
    return app.close();
  });

  it('controller in module should work', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/apps/foo')
      .expect(200)
      .expect(res => {
        expect(res.body.app).toBe('mock-app:foo');
      });
  });

  it('tegg controller should not construct AppService', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/apps/foo')
      .expect(200)
      .expect(res => {
        expect(res.body.app).toBe('mock-app:foo');
      });
    expect((global as any).constructAppService).toBeUndefined();
  });

  it('egg controller should construct AppService', async () => {
    app.mockCsrf();
    await app
      .httpRequest()
      .get('/apps2/foo')
      .expect(200)
      .expect(res => {
        expect(res.body.app).toBe('mock-app:foo');
      });
    expect((global as any).constructAppService).toBe(true);
  });
});
