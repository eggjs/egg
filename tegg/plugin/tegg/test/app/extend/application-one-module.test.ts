import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';

import PersistenceService from '../../fixtures/apps/egg-app-simple/modules/multi-module-repo/PersistenceService.ts';

import { getAppBaseDir } from '../../utils.ts';

describe('test/app/extend/application-one-module.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(async () => {
    await mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: getAppBaseDir('egg-app-simple'),
    });
    await app.ready();
  });

  describe('getEggObject', () => {
    it('should work', async () => {
      const persistenceService = await app.getEggObject(PersistenceService);
      assert(persistenceService);
      assert(persistenceService instanceof PersistenceService);
    });
  });
});
