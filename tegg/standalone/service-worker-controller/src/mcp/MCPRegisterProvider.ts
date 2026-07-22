import { ControllerType } from '@eggjs/controller-decorator';
import { MCPControllerRegister, type ControllerRegisterFactory } from '@eggjs/controller-runtime';
import { Inject, InnerObjectProto, LifecyclePostInject } from '@eggjs/tegg';
import { AccessLevel } from '@eggjs/tegg-types';

import { ServiceWorkerMcpRouter } from './ServiceWorkerMcpRouter.ts';

/** Collects and finalizes MCP registrations for the fetch host. */
@InnerObjectProto({ name: 'mcpRegisterProvider', accessLevel: AccessLevel.PUBLIC })
export class MCPRegisterProvider {
  @Inject()
  private readonly mcpRouter: ServiceWorkerMcpRouter;

  @Inject()
  private readonly controllerRegisterFactory: ControllerRegisterFactory;

  #register?: MCPControllerRegister;

  @LifecyclePostInject()
  protected init(): void {
    this.controllerRegisterFactory.registerControllerRegister(ControllerType.MCP, (proto) => {
      this.#register ??= new MCPControllerRegister(this.mcpRouter);
      this.#register.addControllerProto(proto);
      return this.#register;
    });
  }

  doRegister(): void {
    this.#register?.doRegister();
  }
}
