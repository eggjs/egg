import assert from 'node:assert/strict';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';

import { AopService } from './fixtures/apps/module-plugin-app/modules/plugin-module/AopService.ts';
import { HelloService } from './fixtures/apps/module-plugin-app/modules/plugin-module/HelloService.ts';
import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/ModulePlugin.test.ts', () => {
  let app: MockApplication;

  beforeAll(async () => {
    app = mm.app({
      baseDir: getAppBaseDir('module-plugin-app'),
      // Run on the real Egg classes while leaving package.json pointed at a
      // minimal framework with no AOP dependency. Module discovery must get
      // teggAop from the enabled plugin itself, not from framework scanning.
      framework: path.join(import.meta.dirname, '../../../../packages/egg'),
    });
    await app.ready();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  it('should run module plugin lifecycle protos in app mode', async () => {
    const helloService = await app.getEggObject(HelloService);
    const result = helloService.hello();

    // EggObjectLifecycleProto hooked the business object creation
    assert.equal(result.message, 'from HelloObjectHook');

    // LoadUnitLifecycleProto (with inner object DI through InnerCounter)
    // observed the business load unit creations — registered before any
    // business load unit was created.
    assert(result.createdLoadUnits.length > 0);
    assert(
      result.createdLoadUnits.some((t) => t.endsWith(':pluginModule')),
      `should contain pluginModule, got ${JSON.stringify(result.createdLoadUnits)}`,
    );
    // counter proves the private inner object was injected and shared
    assert.equal(result.createdLoadUnits[0].split(':')[0], '1');
  });

  it('should inject PUBLIC inner object into business singleton', async () => {
    const helloService = await app.getEggObject(HelloService);
    assert(helloService.innerRegistry);
    assert.equal(typeof helloService.innerRegistry.record, 'function');
  });

  it('should keep AOP active when config/module.json short-circuits dependency scanning', async () => {
    const reference = app.moduleReferences.find((item) => item.name === 'teggAop');
    assert(reference);
    assert.equal(reference.optional, false);

    const service = await app.getEggObject(AopService);
    assert.equal(await service.greet('module-json'), 'hello advised:module-json');
  });
});
