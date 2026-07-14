import { ControllerType } from '@eggjs/controller-decorator';
import { MCPControllerRegister, type ControllerRegisterFactory } from '@eggjs/controller-runtime';
import { Inject, InnerObjectProto, LifecyclePostInject } from '@eggjs/tegg';
import { AccessLevel } from '@eggjs/tegg-types';

import { ServiceWorkerMcpRouter } from './ServiceWorkerMcpRouter.ts';

/**
 * Plugs the shared, host-agnostic MCP collect-register into the controller
 * register factory, bound to the fetch host's {@link ServiceWorkerMcpRouter}.
 * The register only collects records; the router owns the fetch transport.
 */
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

  async doRegister(): Promise<void> {
    await this.mcpRouter.doRegister();
  }
}
