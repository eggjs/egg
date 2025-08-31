import assert from 'node:assert/strict';

import { mm } from 'mm';

import { createApp, getFilepath, type Application } from '../helper.js';

describe('test/loader/get_load_units.test.ts', () => {
  let app: Application;
  afterEach(mm.restore);
  afterEach(() => app.close());

  it('should get plugin dir', async () => {
    app = createApp('plugin');
    await app.loader.loadPlugin();
    // delete cache
    delete app.loader.dirs;
    const units = app.loader.getLoadUnits();
    assert.equal(units.length, 12);
    assert.equal(units[10].type, 'framework');
    if (process.platform === 'win32') {
      assert.equal(units[10].path.toLowerCase(), getFilepath('egg-esm'));
    } else {
      assert.equal(units[10].path, getFilepath('egg-esm'));
    }
    assert.equal(units[11].type, 'app');
    if (process.platform === 'win32') {
      assert.equal(units[11].path.toLowerCase(), getFilepath('plugin'));
    } else {
      assert.equal(units[11].path, getFilepath('plugin'));
    }
  });

  it('should not get plugin dir', () => {
    app = createApp('plugin');
    const units = app.loader.getLoadUnits();
    assert.equal(units.length, 2);
  });
});
