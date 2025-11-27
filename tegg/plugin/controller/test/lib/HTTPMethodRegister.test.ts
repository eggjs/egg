import path from 'node:path';

import {
  EggPrototypeCreatorFactory,
  EggPrototypeFactory,
  EggPrototypeLifecycleUtil,
  type LoadUnit,
  LoadUnitFactory,
} from '@eggjs/metadata';
import { EggRouter } from '@eggjs/router';
import { CONTROLLER_META_DATA, HTTPControllerMeta } from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { CONTROLLER_LOAD_UNIT, ControllerLoadUnit } from '../../src/lib/ControllerLoadUnit.ts';
import { EggControllerLoader } from '../../src/lib/EggControllerLoader.ts';
import { EggControllerPrototypeHook } from '../../src/lib/EggControllerPrototypeHook.ts';
import { HTTPMethodRegister } from '../../src/lib/impl/http/HTTPMethodRegister.ts';
import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/lib/HTTPControllerRegister.test.ts', () => {
  describe('method/path is registered', () => {
    const router = new EggRouter({}, {} as any);
    const controllerPrototypeHook = new EggControllerPrototypeHook();
    let loadUnit: LoadUnit;

    beforeAll(async () => {
      EggPrototypeLifecycleUtil.registerLifecycle(controllerPrototypeHook);
      router.get('mock_controller', '/apps/:id', () => {
        // ...
      });
      const baseDir = getFixtures('apps/http-conflict-app');
      const controllerDir = path.join(baseDir, 'app/controller');
      const loader = new EggControllerLoader(controllerDir);

      LoadUnitFactory.registerLoadUnitCreator(CONTROLLER_LOAD_UNIT, (ctx) => {
        return new ControllerLoadUnit(
          'tegg-app-controller',
          ctx.unitPath,
          ctx.loader,
          new EggPrototypeFactory(),
          EggPrototypeCreatorFactory,
        );
      });

      loadUnit = await LoadUnitFactory.createLoadUnit(controllerDir, CONTROLLER_LOAD_UNIT, loader);
    });

    afterAll(async () => {
      EggPrototypeLifecycleUtil.deleteLifecycle(controllerPrototypeHook);
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    });

    it('should throw error with same rule', async () => {
      const proto = loadUnit.getEggPrototype('appController', [])[0];
      const controllerMeta = proto.getMetaData<HTTPControllerMeta>(CONTROLLER_META_DATA)!;
      await expect(async () => {
        for (const methodMeta of controllerMeta.methods) {
          const register = new HTTPMethodRegister(
            proto,
            controllerMeta,
            methodMeta,
            router,
            new Map(),
            EggContainerFactory,
          );
          await register.checkDuplicate();
        }
      }).rejects.toThrow(
        /RouterConflictError: register http controller GET AppController.get failed, GET \/apps\/:id is conflict with exists rule \/apps\/:id/,
      );
    });

    it('should throw error with sub rule', async () => {
      const proto = loadUnit.getEggPrototype('appController', [])[0];
      const controllerMeta = proto.getMetaData<HTTPControllerMeta>(CONTROLLER_META_DATA)!;
      await expect(async () => {
        const register = new HTTPMethodRegister(
          proto,
          controllerMeta,
          {
            name: 'test',
            method: 'GET',
            path: '/123',
          } as any,
          router,
          new Map(),
          EggContainerFactory,
        );

        await register.checkDuplicate();
      }).rejects.toThrow(
        /RouterConflictError: register http controller GET AppController.test failed, GET \/apps\/123 is conflict with exists rule \/apps\/:id/,
      );
    });

    it('should throw error with same rule with host', async () => {
      const proto1 = loadUnit.getEggPrototype('appController1', [])[0];
      const proto2 = loadUnit.getEggPrototype('appController2', [])[0];
      const controllerMeta1 = proto1.getMetaData<HTTPControllerMeta>(CONTROLLER_META_DATA)!;
      const controllerMeta2 = proto2.getMetaData<HTTPControllerMeta>(CONTROLLER_META_DATA)!;
      await expect(async () => {
        const routerMap = new Map();
        for (const methodMeta of controllerMeta1.methods) {
          const register = new HTTPMethodRegister(
            proto1,
            controllerMeta1,
            methodMeta,
            router,
            routerMap,
            EggContainerFactory,
          );
          await register.checkDuplicate();
        }
        for (const methodMeta of controllerMeta2.methods) {
          const register = new HTTPMethodRegister(
            proto2,
            controllerMeta2,
            methodMeta,
            router,
            routerMap,
            EggContainerFactory,
          );
          await register.checkDuplicate();
        }
      }).rejects.toThrow(
        /RouterConflictError: register http controller GET AppController2\.get failed, GET \/foo\/:id is conflict with exists rule \/foo\/:id/,
      );
    });
  });
});
