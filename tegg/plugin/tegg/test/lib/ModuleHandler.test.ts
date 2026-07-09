import assert from 'node:assert/strict';
import { mock } from 'node:test';

import { EggLoadUnitType, LoadUnitFactory, type LoadUnit } from '@eggjs/metadata';
import { LoadUnitInstanceFactory, type LoadUnitInstance } from '@eggjs/tegg-runtime';
import { afterEach, describe, it } from 'vitest';

import { ModuleHandler } from '../../src/lib/ModuleHandler.ts';

function createLoadUnit(name: string): LoadUnit {
  return {
    name,
    type: EggLoadUnitType.APP,
  } as unknown as LoadUnit;
}

function createInstance(name: string): LoadUnitInstance {
  return {
    loadUnit: createLoadUnit(name),
  } as unknown as LoadUnitInstance;
}

function createHandler(): ModuleHandler {
  const app = {
    baseDir: '/tmp/app',
    config: { env: 'test' },
    context: {},
    eggPrototypeCreatorFactory: {
      registerPrototypeCreator() {},
    },
    logger: console,
    moduleConfigs: {},
    name: 'test-app',
  } as any;
  const handler = new ModuleHandler(app);
  app.moduleHandler = handler;
  (handler as any).loadUnitLoader = {
    async initGraph() {},
    async load() {},
    moduleDescriptors: [],
  };
  return handler;
}

describe('plugin/tegg/test/lib/ModuleHandler.test.ts', () => {
  afterEach(() => {
    mock.reset();
  });

  it('should track initialized load unit instances before init finishes', async () => {
    const handler = createHandler();
    const innerInstance = createInstance('inner');
    const firstLoadUnit = createLoadUnit('first');
    const secondLoadUnit = createLoadUnit('second');
    handler.loadUnits.push(firstLoadUnit, secondLoadUnit);
    (handler as any).instantiateInnerObjectLoadUnit = async () => innerInstance;

    mock.method(LoadUnitInstanceFactory, 'createLoadUnitInstance', async (loadUnit: LoadUnit) => {
      if (loadUnit === secondLoadUnit) {
        throw new Error('create failed');
      }
      return { loadUnit } as LoadUnitInstance;
    });

    await assert.rejects(() => handler.init(), /create failed/);
    assert.deepEqual(
      handler.loadUnitInstances.map((instance) => String(instance.loadUnit.name)),
      ['inner', 'first'],
    );
  });

  it('should continue destroying remaining load units and aggregate errors', async () => {
    const handler = createHandler();
    const firstLoadUnit = createLoadUnit('first');
    const secondLoadUnit = createLoadUnit('second');
    handler.loadUnitInstances.push(createInstance('inner'), createInstance('business'));
    handler.loadUnits.push(firstLoadUnit, secondLoadUnit);

    const destroyed: string[] = [];
    const destroyedInstances: string[] = [];
    const destroyedLoadUnits: string[] = [];
    mock.method(LoadUnitInstanceFactory, 'destroyLoadUnitInstance', async (instance: LoadUnitInstance) => {
      destroyed.push(`instance:${String(instance.loadUnit.name)}`);
      destroyedInstances.push(String(instance.loadUnit.name));
      if (instance.loadUnit.name === 'business') {
        throw new Error('destroy instance failed');
      }
    });
    mock.method(LoadUnitFactory, 'destroyLoadUnit', async (loadUnit: LoadUnit) => {
      destroyed.push(`loadUnit:${String(loadUnit.name)}`);
      destroyedLoadUnits.push(String(loadUnit.name));
      if (loadUnit === firstLoadUnit) {
        throw new Error('destroy load unit failed');
      }
    });

    await assert.rejects(
      () => handler.destroy(),
      (e: unknown) => {
        assert(e instanceof AggregateError);
        assert.equal(e.message, 'destroy tegg module handler failed');
        assert.equal(e.errors.length, 2);
        return true;
      },
    );
    assert.deepEqual(destroyedInstances, ['business', 'inner']);
    assert.deepEqual(destroyedLoadUnits, ['second', 'first']);
    assert.deepEqual(destroyed, ['instance:business', 'loadUnit:second', 'loadUnit:first', 'instance:inner']);
  });
});
