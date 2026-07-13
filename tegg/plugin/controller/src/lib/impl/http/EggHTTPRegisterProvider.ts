import { ControllerType } from '@eggjs/controller-decorator';
import {
  HTTPControllerRegister,
  type ControllerRegisterFactory,
  type RootProtoManager,
} from '@eggjs/controller-runtime';
import { EggQualifier, EggType, Inject, InnerObjectProto } from '@eggjs/core-decorator';
import { LifecyclePostInject } from '@eggjs/lifecycle';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { AccessLevel } from '@eggjs/tegg-types';
import type { Router } from 'egg';

import { EggHTTPMethodRegister } from './EggHTTPMethodRegister.ts';

// PUBLIC: the controller boot resolves it by name (`getPrototype`) for doRegister.
@InnerObjectProto({ name: 'httpRegisterProvider', accessLevel: AccessLevel.PUBLIC })
export class EggHTTPRegisterProvider {
  // `router` is both an app and a ctx property; @EggQualifier(APP) forces the
  // app-scoped compat proto (a plain inject would default to CONTEXT).
  @Inject()
  @EggQualifier(EggType.APP)
  private readonly router: Router;

  @Inject()
  private readonly controllerRegisterFactory: ControllerRegisterFactory;

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

  doRegister(rootProtoManager: RootProtoManager): void {
    this.#register?.doRegister(rootProtoManager);
  }
}
