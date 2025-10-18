import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';

import { App2 } from './fixtures/apps/app-multi-inject-multi/app/modules/app2/App.ts';
import { App } from './fixtures/apps/app-multi-inject-multi/app/modules/app/App.ts';
import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/MultiInstanceInjectMultiInstance.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: getAppBaseDir('app-multi-inject-multi'),
    });
    await app.ready();
  });

  it('dynamic inject should work', async () => {
    const app2Instance: App2 = await app.getEggObject(App2);
    const appInstance: App = await app.getEggObject(App);
    const app2Secret = app2Instance.secret.getSecret('mock');
    const appName = appInstance.bizManager.name;
    const appSecret = appInstance.bizManager.secret;

    assert.equal(app2Secret, 'mock233');
    assert.equal(appName, 'foo');
    assert.equal(appSecret, 'foo233');
  });
});
