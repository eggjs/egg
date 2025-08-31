import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'vitest';

import { createApp, getFilepath, type Application } from '../helper.js';

describe('test/loader/get_appname.test.ts', () => {
  let app: Application;
  afterEach(() => app && app.close());

  it('should get appname', () => {
    app = createApp('appname');
    assert.equal(app.loader.getAppname(), 'appname');
  });

  it('should throw when appname is not found', () => {
    const pkg = getFilepath('app-noname/package.json');
    assert.throws(() => {
      createApp('app-noname');
    }, (err: any) => {
      return err.message.includes(`name is required from ${pkg}`);
    });
  });
});
