import { mm, type MockApplication } from '@eggjs/mock';
// import assert from 'node:assert/strict';

import { describe, it, afterAll, afterEach, beforeAll } from 'vitest';

// import { UsedProto } from './fixtures/apps/plugin-module/node_modules/foo-plugin/Used.ts';

describe.skip('plugin/tegg/test/OptionalPluginModule.test.ts', () => {
  let app: MockApplication;

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: 'apps/plugin-module',
    });
    await app.ready();
  });

  it('should work', async () => {
    // await app.mockModuleContextScope(async ctx => {
    //   const usedProto = await ctx.getEggObject(UsedProto);
    //   assert(usedProto);
    // });
  });
});
