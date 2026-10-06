import path from 'node:path';

import { LoadUnitFactory } from '@eggjs/metadata';
import { CoreTestHelper, LoaderUtil } from '@eggjs/module-test-util';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { EggLoadUnitType, type LoadUnitInstance } from '@eggjs/tegg-types';

import { LoadUnitInstanceFactory } from '../src/index.ts';

export default class TestUtil {
  static readonly #ownedInnerInstances = new Map<LoadUnitInstance, LoadUnitInstance>();

  static async createLoadUnitInstance(modulePath: string, buildGraph = true): Promise<LoadUnitInstance> {
    const absolutePath = path.join(__dirname, 'fixtures/modules', modulePath);
    const builtGraph = buildGraph ? await LoaderUtil.buildGlobalGraph([absolutePath]) : undefined;
    const loader = LoaderFactory.createLoader(absolutePath, EggLoadUnitType.MODULE);
    const loadUnit = await LoadUnitFactory.createLoadUnit(absolutePath, EggLoadUnitType.MODULE, loader);
    const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
    if (builtGraph) {
      this.#ownedInnerInstances.set(instance, builtGraph.innerObjectLoadUnitInstance);
    }
    return instance;
  }

  static async destroyLoadUnitInstance(loadUnitInstance: LoadUnitInstance): Promise<void> {
    const innerInstance = this.#ownedInnerInstances.get(loadUnitInstance);
    this.#ownedInnerInstances.delete(loadUnitInstance);
    await CoreTestHelper.destroyModules(innerInstance ? [loadUnitInstance, innerInstance] : [loadUnitInstance]);
  }
}
