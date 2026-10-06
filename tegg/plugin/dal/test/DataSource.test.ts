import path from 'node:path';

import { PrototypeUtil } from '@eggjs/core-decorator';
import { DataSourceInjectName, DataSourceQualifierAttribute } from '@eggjs/dal-decorator';
import { RealLoaderFS } from '@eggjs/loader-fs';
import { GlobalGraph } from '@eggjs/metadata';
import { createTeggManifestLoaderFS, LoaderFactory } from '@eggjs/tegg-loader';
import { TeggScope } from '@eggjs/tegg-types';
import { describe, expect, it } from 'vitest';

import { DataSourceDelegate } from '../src/lib/DataSource.ts';

describe('plugin/dal/test/DataSource.test.ts', () => {
  class NoGlobLoaderFS extends RealLoaderFS {
    glob(): string[] {
      throw new Error('dynamic DAL discovery should reuse the scoped manifest LoaderFS');
    }
  }

  function createLoaderFS(unitPath: string) {
    return createTeggManifestLoaderFS(
      unitPath,
      {
        moduleReferences: [{ name: 'dal', path: unitPath }],
        moduleDescriptors: [{ name: 'dal', unitPath, decoratedFiles: ['Foo.ts'] }],
      },
      new NoGlobLoaderFS(),
    );
  }

  it('should create data source definitions through the scoped LoaderFS', async () => {
    const unitPath = path.join(import.meta.dirname, 'fixtures/apps/dal-app/modules/dal');
    const property = await TeggScope.run(TeggScope.createBag(), async () => {
      await LoaderFactory.loadApp([{ name: 'dal', path: unitPath }], createLoaderFS(unitPath));
      return await PrototypeUtil.getDynamicMultiInstanceProperty(DataSourceDelegate, {
        moduleName: 'dal',
        unitPath,
      });
    });

    expect(property?.objects).toEqual([
      {
        name: 'dataSource',
        qualifiers: [
          {
            attribute: DataSourceQualifierAttribute,
            value: 'dal.foo.Foo',
          },
        ],
      },
    ]);
  });

  it('should use the scoped LoaderFS while building the global graph', async () => {
    const unitPath = path.join(import.meta.dirname, 'fixtures/apps/dal-app/modules/dal');
    const graph = await TeggScope.run(TeggScope.createBag(), async () => {
      const [moduleDescriptor] = await LoaderFactory.loadApp(
        [{ name: 'dal', path: unitPath }],
        createLoaderFS(unitPath),
      );
      moduleDescriptor.multiInstanceClazzList.push(DataSourceDelegate);
      return await GlobalGraph.create([moduleDescriptor]);
    });
    const dataSourceProto = graph
      .findModuleNode('dal')
      ?.val.protos.map((node) => node.val.proto)
      .find((proto) => proto.name === DataSourceInjectName);

    expect(dataSourceProto?.qualifiers).toContainEqual({
      attribute: DataSourceQualifierAttribute,
      value: 'dal.foo.Foo',
    });
  });
});
