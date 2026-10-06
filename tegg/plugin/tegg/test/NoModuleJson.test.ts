import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, afterEach, beforeAll } from 'vitest';

import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/NoModuleJson.test.ts', () => {
  let app: MockApplication;
  const baseDir = getAppBaseDir('app-with-no-module-json');

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir,
    });
    await app.ready();
  }, 30_000);

  it('should work', async () => {
    await app
      .httpRequest()
      .get('/config')
      .expect(200)
      .expect((res) => {
        assert.equal(res.body.baseDir, baseDir);
      });
  });
});
