import assert from 'node:assert/strict';

import { mm } from '@eggjs/mock';

import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/close.test.ts', () => {
  it('should clean lifecycle hooks', async () => {
    const app = mm.app({
      baseDir: getAppBaseDir('schedule-app'),
    });
    await app.ready();
    await app.close();

    assert.equal(app.loadUnitLifecycleUtil.getLifecycleList().length, 0);
    assert.equal(app.loadUnitInstanceLifecycleUtil.getLifecycleList().length, 0);
    assert.equal(app.eggContextLifecycleUtil.getLifecycleList().length, 0);
    assert.equal(app.eggPrototypeLifecycleUtil.getLifecycleList().length, 0);
    assert.equal(app.eggObjectLifecycleUtil.getLifecycleList().length, 0);
  });
});
