import { ControllerType } from '@eggjs/controller-decorator';
import {
  HTTPControllerRegister,
  type ControllerRegisterFactory,
  type RootProtoManager,
} from '@eggjs/controller-runtime';
import { Inject, InnerObjectProto } from '@eggjs/core-decorator';
import { LifecyclePostInject } from '@eggjs/lifecycle';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { AccessLevel } from '@eggjs/tegg-types';
import type { Router } from 'egg';

import { EggHTTPMethodRegister } from './EggHTTPMethodRegister.ts';

/**
 * Owns the egg host's HTTPControllerRegister as a container citizen: the
 * provider is an inner object (per-app via the InnerObjectLoadUnit, no static
 * TeggScope slot) that injects the app's router — handed in as the provided
 * inner object `httpRouter` by ModuleHandler — and plugs the HTTP register
 * creator into the controller register factory. Structurally identical to the
 * fetch host's HTTPRegisterProvider; only the injected router and
 * method-register differ. (It is `httpRouter`, not `router`: see the
 * ModuleHandler note — `router` is an app property and would be routed to the
 * egg compatible app proto instead of this provided inner object.)
 */
@InnerObjectProto({ name: 'httpRegisterProvider', accessLevel: AccessLevel.PUBLIC })
export class EggHTTPRegisterProvider {
  @Inject()
  private readonly httpRouter: Router;

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
      this.httpRouter,
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
