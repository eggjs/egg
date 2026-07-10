import { ControllerType } from '@eggjs/controller-decorator';
import { HTTPControllerRegister, type RootProtoManager } from '@eggjs/controller-runtime';
import type { ControllerRegisterFactory } from '@eggjs/controller-runtime';
import { Inject, InnerObjectProto, LifecyclePostInject } from '@eggjs/tegg';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { AccessLevel } from '@eggjs/tegg-types';

import { FetchHTTPMethodRegister } from './FetchHTTPMethodRegister.ts';
import type { FetchRouter } from './FetchRouter.ts';

/**
 * Owns the fetch host's HTTPControllerRegister (no per-app statics: the
 * provider is an inner object, scoped to its app by the InnerObjectLoadUnit)
 * and plugs the HTTP register creator into the controller register factory.
 */
@InnerObjectProto({ name: 'httpRegisterProvider', accessLevel: AccessLevel.PUBLIC })
export class HTTPRegisterProvider {
  @Inject()
  private readonly fetchRouter: FetchRouter;

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
      this.fetchRouter,
      EggContainerFactory,
      (proto, controllerMeta, methodMeta, router, checkRouters, containerFactory) =>
        new FetchHTTPMethodRegister(proto, controllerMeta, methodMeta, router, checkRouters, containerFactory),
    );
    return this.#register;
  }

  doRegister(rootProtoManager: RootProtoManager): void {
    this.#register?.doRegister(rootProtoManager);
  }
}
