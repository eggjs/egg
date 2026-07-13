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

// Owns egg's HTTP controller registration end to end: it plugs the HTTP register
// creator into the factory (@LifecyclePostInject) so controllers accumulate as
// load units are scanned, then mounts them all — priority-sorted — onto
// `app.router` as a LoadUnitInstance lifecycle hook. `app/controller`
// (CONTROLLER_LOAD_UNIT) is the last controller-bearing load unit egg creates,
// so once its instance is created every controller proto across all load units
// has been collected; postCreate is the container-native replacement for a
// boot-time manual doRegister.
@LoadUnitInstanceLifecycleProto()
export class EggHTTPControllerRegistrar implements LifecycleHook<LoadUnitInstanceLifecycleContext, LoadUnitInstance> {
  // `router` is both an app and a ctx property; @EggQualifier(APP) forces the
  // app-scoped compat proto (a plain inject would default to CONTEXT).
  @Inject()
  @EggQualifier(EggType.APP)
  private readonly router: Router;

  @Inject()
  private readonly controllerRegisterFactory: ControllerRegisterFactory;

  // `app.rootProtoManager` is mounted on the app before the inner-object graph
  // builds, so it arrives as an APP compat proto — same as `router`.
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
