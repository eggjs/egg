import path from 'node:path';

import { EggLoadUnitType, type LoadUnitInstance } from '@eggjs/tegg-types';
import { LoadUnitFactory } from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { LoaderUtil } from '@eggjs/module-test-util';

import { LoadUnitInstanceFactory } from '../src/index.ts';

export default class TestUtil {
  static async createLoadUnitInstance(modulePath: string, buildGraph = true): Promise<LoadUnitInstance> {
    const absolutePath = path.join(__dirname, 'fixtures/modules', modulePath);
    if (buildGraph) {
      await LoaderUtil.buildGlobalGraph([absolutePath]);
    }
    const loader = LoaderFactory.createLoader(absolutePath, EggLoadUnitType.MODULE);
    const loadUnit = await LoadUnitFactory.createLoadUnit(absolutePath, EggLoadUnitType.MODULE, loader);
    return await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
  }

  static async destroyLoadUnitInstance(loadUnitInstance: LoadUnitInstance): Promise<void> {
    await LoadUnitInstanceFactory.destroyLoadUnitInstance(loadUnitInstance);
    await LoadUnitFactory.destroyLoadUnit(loadUnitInstance.loadUnit);
  }
}
