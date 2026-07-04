import assert from 'node:assert/strict';
import path from 'node:path';

import { ModuleDescriptorDumper } from '@eggjs/metadata';
import { EggLoadUnitType } from '@eggjs/tegg-types';
import type { ModuleReference } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { LoaderFactory } from '../src/index.ts';

describe('core/loader/test/LoaderInnerObject.test.ts', () => {
  const modulePath = path.join(__dirname, './fixtures/modules/module-with-inner-object');
  const moduleRef: ModuleReference = {
    name: 'inner-object-module',
    path: modulePath,
    loaderType: EggLoadUnitType.MODULE,
  };

  it('should divert inner object clazz to innerObjectClazzList', async () => {
    const [descriptor] = await LoaderFactory.loadApp([moduleRef]);

    const innerNames = descriptor.innerObjectClazzList.map((t) => t.name).sort();
    assert.deepEqual(innerNames, ['ControllerHook', 'FetchRouter']);

    // Inner object classes must NOT stay in clazzList.
    const clazzNames = descriptor.clazzList.map((t) => t.name);
    assert.deepEqual(clazzNames, ['HelloService']);
    assert.deepEqual(descriptor.multiInstanceClazzList, []);
  });

  it('should record inner object files in decoratedFiles for manifest', async () => {
    const [descriptor] = await LoaderFactory.loadApp([moduleRef]);
    const files = ModuleDescriptorDumper.getDecoratedFiles(descriptor).sort();
    assert.deepEqual(files, ['ControllerHook.ts', 'FetchRouter.ts', 'HelloService.ts']);
  });

  it('should dump innerObjectClazzList in module descriptor json', async () => {
    const [descriptor] = await LoaderFactory.loadApp([moduleRef]);
    const json = JSON.parse(ModuleDescriptorDumper.stringifyDescriptor(descriptor));
    assert.deepEqual(json.innerObjectClazzList.map((t: { name: string }) => t.name).sort(), [
      'ControllerHook',
      'FetchRouter',
    ]);
  });
});
