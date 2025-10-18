// import assert from 'node:assert/strict';
// import { mm, MockApplication } from '@eggjs/mock';
// import { UsedProto } from './fixtures/apps/plugin-module/node_modules/foo-plugin/Used.js';

// describe('plugin/tegg/test/OptionalPluginModule.test.ts', () => {
//   let app: MockApplication;

//   after(async () => {
//     await app.close();
//   });

//   afterEach(() => {
//     return mm.restore();
//   });

//   before(async () => {
//     app = mm.app({
//       baseDir: 'apps/plugin-module',
//     });
//     await app.ready();
//   });

//   it('should work', async () => {
//     await app.mockModuleContextScope(async ctx => {
//       const usedProto = await ctx.getEggObject(UsedProto);
//       assert(usedProto);
//     });
//   });
// });
