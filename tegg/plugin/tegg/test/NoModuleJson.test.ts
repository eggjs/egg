import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';

import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/NoModuleJson.test.ts', () => {
  let app: MockApplication;
  const baseDir = getAppBaseDir('app-with-no-module-json');

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir,
    });
    await app.ready();
  });

  it('should work', async () => {
    await app
      .httpRequest()
      .get('/config')
      .expect(200)
      .expect(res => {
        assert.equal(res.body.baseDir, baseDir);
      });
  });
});
