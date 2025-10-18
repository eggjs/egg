// import assert from 'node:assert/strict';
// import { mm, MockApplication } from '@eggjs/mock';
// import { RootProto } from './fixtures/apps/optional-module/app/modules/root/Root.js';
// import { UsedProto } from './fixtures/apps/optional-module/node_modules/used/Used.js';
// import { UnusedProto } from './fixtures/apps/optional-module/node_modules/unused/Unused.js';

// describe('plugin/tegg/test/OptionalModule.test.ts', () => {
//   let app: MockApplication;

//   after(async () => {
//     await app.close();
//   });

//   afterEach(() => {
//     return mm.restore();
//   });

//   before(async () => {
//     app = mm.app({
//       baseDir: 'apps/optional-module',
//     });
//     await app.ready();
//   });

//   it('should work', async () => {
//     await app.mockModuleContextScope(async ctx => {
//       const rootProto = await ctx.getEggObject(RootProto);
//       assert(rootProto);
//       const usedProto = await ctx.getEggObject(UsedProto);
//       assert(usedProto);
//       await assert.rejects(async () => {
//         await ctx.getEggObject(UnusedProto);
//       }, /can not get proto for clazz UnusedProto/);
//     });
//   });
// });
