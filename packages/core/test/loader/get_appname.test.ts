import assert from 'node:assert/strict';

import { createApp, getFilepath, type Application } from '../helper.js';

describe('test/loader/get_appname.test.ts', () => {
  let app: Application;
  afterEach(() => app && app.close());

  it('should get appname', () => {
    app = createApp('appname');
    assert.equal(app.loader.getAppname(), 'appname');
  });

  it('should throw when appname is not found', done => {
    const pkg = getFilepath('app-noname/package.json');
    try {
      createApp('app-noname');
    } catch (err: any) {
      assert(err.message.includes(`name is required from ${pkg}`));
      done();
    }
  });
});
