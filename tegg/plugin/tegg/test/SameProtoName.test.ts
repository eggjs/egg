import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';

import { BarService } from './fixtures/apps/same-name-protos/app/modules/module-a/BarService.ts';
import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/SameProtoName.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: getAppBaseDir('same-name-protos'),
    });
    await app.ready();
  });

  it('should work', async () => {
    await app.mockModuleContextScope(async ctx => {
      const barService = await ctx.getEggObject(BarService);
      assert(barService);
      assert(barService.fooService);
    });
  });
});
