import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';

import { Foo } from './fixtures/apps/constructor-module-config/modules/module-with-config/foo.ts';
import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/ModuleConfig.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: getAppBaseDir('constructor-module-config'),
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
          foo: 'bar',
          bar: 'foo',
        });
      });
  });

  it('construct proxy should work', async () => {
    const foo: Foo = await app.getEggObject(Foo);
    foo.log();
  });
});
