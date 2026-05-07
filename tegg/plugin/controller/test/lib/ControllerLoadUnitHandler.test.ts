import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CONTROLLER_LOAD_UNIT } from '../../src/lib/ControllerLoadUnit.ts';
import { ControllerLoadUnitHandler } from '../../src/lib/ControllerLoadUnitHandler.ts';

describe('plugin/controller/test/lib/ControllerLoadUnitHandler.test.ts', () => {
  it('should fall back to app.baseDir when config.baseDir is not restored yet', async () => {
    const baseDir = '/runtime/app';
    const controllerDir = path.join(baseDir, 'app/controller');
    const loader = {};
    const loadUnit = {};
    const loadUnitInstance = {};
    const calls: string[] = [];
    const app = {
      baseDir,
      config: {},
      loaderFactory: {
        createLoader(unitPath: string, type: string) {
          calls.push(`loader:${unitPath}:${type}`);
          return loader;
        },
      },
      loadUnitFactory: {
        async createLoadUnit(unitPath: string, type: string, createdLoader: unknown) {
          calls.push(`loadUnit:${unitPath}:${type}:${createdLoader === loader}`);
          return loadUnit;
        },
      },
      loadUnitInstanceFactory: {
        async createLoadUnitInstance(createdLoadUnit: unknown) {
          calls.push(`instance:${createdLoadUnit === loadUnit}`);
          return loadUnitInstance;
        },
      },
    };

    const handler = new ControllerLoadUnitHandler(app as any);
    await handler._init();

    expect(calls).toEqual([
      `loader:${controllerDir}:${CONTROLLER_LOAD_UNIT}`,
      `loadUnit:${controllerDir}:${CONTROLLER_LOAD_UNIT}:true`,
      'instance:true',
    ]);
    expect(handler.controllerLoadUnit).toBe(loadUnit);
    expect(handler.controllerLoadUnitInstance).toBe(loadUnitInstance);
  });
});
