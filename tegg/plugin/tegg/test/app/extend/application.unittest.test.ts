import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';

describe('test/app/extend/application.unittest.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: 'apps/egg-app',
    });
    await app.ready();
  });

  it('should work', async () => {
    await app.mockModuleContextScope(async () => {
      const traceId = await (app.module as any).multiModuleService.traceService.getTraceId();
      assert(traceId);
    });
  });

  it('should not call mockModuleContext twice', async () => {
    const ctx = await app.mockModuleContext();
    try {
      await assert.rejects(app.mockModuleContext(), /should not call mockModuleContext twice./);
    } finally {
      await app.destroyModuleContext(ctx);
    }
  });
});
