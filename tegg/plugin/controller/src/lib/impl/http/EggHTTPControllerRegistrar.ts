import { ControllerType } from '@eggjs/controller-decorator';
import {
  CONTROLLER_LOAD_UNIT,
  HTTPControllerRegister,
  type ControllerRegisterFactory,
  RootProtoManager,
} from '@eggjs/controller-runtime';
import { EggQualifier, EggType, Inject, LoadUnitInstanceLifecycleProto } from '@eggjs/core-decorator';
import { LifecyclePostInject, type LifecycleHook } from '@eggjs/lifecycle';
import { EggContainerFactory, type LoadUnitInstance, type LoadUnitInstanceLifecycleContext } from '@eggjs/tegg-runtime';
import type { Router } from 'egg';

import { EggHTTPMethodRegister } from './EggHTTPMethodRegister.ts';

/** Finalizes Egg HTTP routes after the controller load unit is created. */
@LoadUnitInstanceLifecycleProto()
export class EggHTTPControllerRegistrar implements LifecycleHook<LoadUnitInstanceLifecycleContext, LoadUnitInstance> {
  // `router` also exists on ctx, so select the application object explicitly.
  @Inject()
  @EggQualifier(EggType.APP)
  private readonly router: Router;

  @Inject()
  private readonly controllerRegisterFactory: ControllerRegisterFactory;

  @Inject()
  @EggQualifier(EggType.APP)
  private readonly rootProtoManager: RootProtoManager;

  #register?: HTTPControllerRegister;

  @LifecyclePostInject()
  protected init(): void {
    this.controllerRegisterFactory.registerControllerRegister(ControllerType.HTTP, (proto) => {
      const register = this.getOrCreateRegister();
      register.addControllerProto(proto);
      return register;
    });
  }

  getOrCreateRegister(): HTTPControllerRegister {
    this.#register ??= new HTTPControllerRegister(
      this.router,
      EggContainerFactory,
      (proto, controllerMeta, methodMeta, methodRouter, checkRouters, containerFactory) =>
        new EggHTTPMethodRegister(proto, controllerMeta, methodMeta, methodRouter, checkRouters, containerFactory),
    );
    return this.#register;
  }

  async postCreate(_ctx: LoadUnitInstanceLifecycleContext, instance: LoadUnitInstance): Promise<void> {
    if (instance.loadUnit.type !== CONTROLLER_LOAD_UNIT) {
      return;
    }
    this.#register?.doRegister(this.rootProtoManager);
  }
}
