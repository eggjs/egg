import assert from 'node:assert/strict';
import path from 'node:path';

import { EggLoadUnitType } from '@eggjs/metadata';
import { describe, it } from 'vitest';

import { LoaderFactory, LoaderUtil } from '../src/index.ts';

describe('core/loader/test/Loader.test.ts', () => {
  describe('module loader', () => {
    it('should load module', async () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/module-for-loader');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      const prototypes = await loader.load();
      assert.equal(prototypes.length, 4);
      const appRepoProto = prototypes.find((t) => t.name === 'AppRepo');
      const appRepo2Proto = prototypes.find((t) => t.name === 'AppRepo2');
      const sprintRepoProto = prototypes.find((t) => t.name === 'SprintRepo');
      const userRepoProto = prototypes.find((t) => t.name === 'UserRepo');
      assert(appRepoProto);
      assert(appRepo2Proto);
      assert(sprintRepoProto);
      assert(userRepoProto);
    });

    it('should not load test/coverage files', async () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/module-with-test');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      const prototypes = await loader.load();
      assert.equal(prototypes.length, 1);
    });

    it('should set extraFilePattern without error', async () => {
      LoaderUtil.setConfig({ extraFilePattern: ['!extra'] });
      const repoModulePath = path.join(__dirname, './fixtures/modules/module-with-extra');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      const prototypes = await loader.load();
      assert.equal(prototypes.length, 1);
    });
  });

  describe('file has tsc error', () => {
    it('should failed', async () => {
      const repoModulePath = path.join(__dirname, './fixtures/modules/loader-failed');
      const loader = LoaderFactory.createLoader(repoModulePath, EggLoadUnitType.MODULE);
      await assert.rejects(
        async () => {
          const prototypes = await loader.load();
          console.log(prototypes);
        },
        (err: Error) => {
          assert.match(
            err.message,
            /Syntax Error|ERROR: Expected ";" but found "here"|Expected `;` but found `Identifier`/,
          );
          return true;
        },
      );
    });
  });
});
