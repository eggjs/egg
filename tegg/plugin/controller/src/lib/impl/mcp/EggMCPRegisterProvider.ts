import { ControllerType, type MCPControllerMeta } from '@eggjs/controller-decorator';
import { MCPControllerRegister, type ControllerRegisterFactory } from '@eggjs/controller-runtime';
import { EggQualifier, EggType, Inject, InjectOptional, InnerObjectProto } from '@eggjs/core-decorator';
import { LifecyclePostInject } from '@eggjs/lifecycle';
import { AccessLevel } from '@eggjs/tegg-types';

import type { EggMcpRouter } from './EggMcpRouter.ts';

/**
 * Plugs the shared, host-agnostic MCP collect-register into the controller
 * register factory, bound to the egg host's {@link EggMcpRouter}. Structurally
 * identical to the fetch host's MCPRegisterProvider; the only difference is that
 * the router is OPTIONAL: it is mounted on `app` (and thus reachable via the egg
 * compat proto) only when the mcpProxy plugin is enabled, so when MCP is off the
 * provider simply plugs nothing in.
 */
// PUBLIC: the controller boot resolves it by name (`getPrototype`) in didLoad.
@InnerObjectProto({ name: 'mcpRegisterProvider', accessLevel: AccessLevel.PUBLIC })
export class EggMCPRegisterProvider {
  // `app.mcpRouter` compat proto (see the controller boot). @EggQualifier(APP)
  // pins it to the app-scoped compat proto; optional because it only exists
  // when MCP is enabled.
  @InjectOptional()
  @EggQualifier(EggType.APP)
  private readonly mcpRouter?: EggMcpRouter;

  @Inject()
  private readonly controllerRegisterFactory: ControllerRegisterFactory;

  #register?: MCPControllerRegister;

  @LifecyclePostInject()
  protected init(): void {
    const mcpRouter = this.mcpRouter;
    if (!mcpRouter) {
      return;
    }
    this.controllerRegisterFactory.registerControllerRegister(ControllerType.MCP, (proto, controllerMeta) => {
      this.#register ??= new MCPControllerRegister(controllerMeta as MCPControllerMeta, mcpRouter);
      this.#register.addControllerProto(proto);
      return this.#register;
    });
  }
}
