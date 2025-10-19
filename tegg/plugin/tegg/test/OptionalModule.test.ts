// import assert from 'node:assert/strict';

import { describe, it, afterAll, afterEach, beforeAll } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';

import { getAppBaseDir } from './utils.ts';
// import { RootProto } from './fixtures/apps/optional-module/app/modules/root/Root.js';
// import { UsedProto } from './fixtures/apps/optional-module/node_modules/used/Used.js';
// import { UnusedProto } from './fixtures/apps/optional-module/node_modules/unused/Unused.js';

describe.skip('plugin/tegg/test/OptionalModule.test.ts', () => {
  let app: MockApplication;

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getAppBaseDir('optional-module'),
    });
    await app.ready();
  });

  it('should work', async () => {
    // await app.mockModuleContextScope(async ctx => {
    //   const rootProto = await ctx.getEggObject(RootProto);
    //   assert(rootProto);
    //   const usedProto = await ctx.getEggObject(UsedProto);
    //   assert(usedProto);
    //   await assert.rejects(async () => {
    //     await ctx.getEggObject(UnusedProto);
    //   }, /can not get proto for clazz UnusedProto/);
    // });
  });
});
