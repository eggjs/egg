import { ControllerType, type MCPControllerMeta } from '@eggjs/controller-decorator';
import type { ControllerRegisterFactory } from '@eggjs/controller-plugin';
import { Inject, InnerObjectProto, LifecyclePostInject } from '@eggjs/tegg';
import { AccessLevel } from '@eggjs/tegg-types';

import type { FetchRouter } from '../http/FetchRouter.ts';
import type { MCPAuthHandler } from '../types.ts';
import { MCPControllerRegister } from './MCPControllerRegister.ts';

/**
 * Owns the fetch host's MCPControllerRegister (no per-app statics) and plugs
 * the MCP register creator into the controller register factory.
 */
@InnerObjectProto({ name: 'mcpRegisterProvider', accessLevel: AccessLevel.PUBLIC })
export class MCPRegisterProvider {
  @Inject()
  private readonly fetchRouter: FetchRouter;

  @Inject()
  private readonly controllerRegisterFactory: ControllerRegisterFactory;

  @Inject()
  private readonly mcpAuthHandler: MCPAuthHandler;

  #register?: MCPControllerRegister;

  @LifecyclePostInject()
  protected init(): void {
    this.controllerRegisterFactory.registerControllerRegister(ControllerType.MCP, (proto, controllerMeta) => {
      this.#register ??= new MCPControllerRegister(
        controllerMeta as MCPControllerMeta,
        this.fetchRouter,
        this.mcpAuthHandler,
      );
      this.#register.addControllerProto(proto);
      return this.#register;
    });
  }

  async doRegister(): Promise<void> {
    await this.#register?.doRegister();
  }
}
