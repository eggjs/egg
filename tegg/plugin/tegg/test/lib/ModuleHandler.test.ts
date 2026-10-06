import assert from 'node:assert/strict';
import { mock } from 'node:test';

import { EggLoadUnitType, type LoadUnit } from '@eggjs/metadata';
import { InnerObjectLoadUnitBuilder, LoadUnitInstanceFactory, type LoadUnitInstance } from '@eggjs/tegg-runtime';
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
    loggers: new Map(),
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

  it('should not add optional module inner objects to the inner builder', async () => {
    const handler = createHandler();
    const requiredInner = class RequiredInner {};
    const optionalInner = class OptionalInner {};
    const innerLoadUnit = createLoadUnit('inner');
    const innerInstance = createInstance('inner');
    (handler as any).loadUnitLoader.moduleDescriptors = [
      {
        name: 'required',
        unitPath: '/required',
        optional: false,
        innerObjectClazzList: [requiredInner],
      },
      {
        name: 'optional',
        unitPath: '/optional',
        optional: true,
        innerObjectClazzList: [optionalInner],
      },
    ];
    const added: unknown[][] = [];
    mock.method(InnerObjectLoadUnitBuilder.prototype, 'addInnerObjectClazzList', (...args: unknown[]) => {
      added.push(args);
    });
    mock.method(InnerObjectLoadUnitBuilder.prototype, 'createLoadUnit', async () => innerLoadUnit);
    mock.method(LoadUnitInstanceFactory, 'createLoadUnitInstance', async () => innerInstance);

    await (handler as any).instantiateInnerObjectLoadUnit();

    assert.deepEqual(added, [[[requiredInner], { name: 'required', path: '/required' }]]);
  });
});
