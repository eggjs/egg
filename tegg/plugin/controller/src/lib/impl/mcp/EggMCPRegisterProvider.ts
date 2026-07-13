import { ControllerType, type MCPControllerMeta } from '@eggjs/controller-decorator';
import { MCPControllerRegister, type ControllerRegisterFactory } from '@eggjs/controller-runtime';
import { EggQualifier, EggType, Inject, InjectOptional, InnerObjectProto } from '@eggjs/core-decorator';
import { LifecyclePostInject } from '@eggjs/lifecycle';

import type { EggMcpRouter } from './EggMcpRouter.ts';

// Plugs the shared MCP collect-register into the factory, bound to EggMcpRouter.
// Mirrors the fetch host's MCPRegisterProvider; the router is OPTIONAL (mounted
// on `app` only when mcpProxy is enabled), so when MCP is off this plugs nothing.
@InnerObjectProto({ name: 'mcpRegisterProvider' })
export class EggMCPRegisterProvider {
  // `app.mcpRouter` compat proto; @EggQualifier(APP) since `router`-like names
  // default to CONTEXT. Optional because it only exists when MCP is enabled.
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
