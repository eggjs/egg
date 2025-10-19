import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, afterEach, beforeAll } from 'vitest';

import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/ModuleConfig.test.ts', () => {
  let app: MockApplication;

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getAppBaseDir('inject-module-config'),
    });
    await app.ready();
  });

  it('should work', async () => {
    await app
      .httpRequest()
      .get('/config')
      .expect(200)
      .expect(res => {
        assert.deepStrictEqual(res.body, {
          moduleConfigs: { features: { dynamic: { foo: 'bar', bar: 'foo' } } },
          moduleConfig: { features: { dynamic: { foo: 'bar', bar: 'foo' } } },
        });
      });
  });

  it('should work with overwrite', async () => {
    await app
      .httpRequest()
      .get('/overwrite_config')
      .expect(200)
      .expect(res => {
        assert.deepStrictEqual(res.body, {
          moduleConfigs: { features: { dynamic: { foo: 'bar', bar: 'overwrite foo' } } },
          moduleConfig: { features: { dynamic: { foo: 'bar', bar: 'overwrite foo' } } },
        });
      });
  });
});
