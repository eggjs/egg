import { ControllerType } from '@eggjs/controller-decorator';
import { CONTROLLER_LOAD_UNIT, MCPControllerRegister, type ControllerRegisterFactory } from '@eggjs/controller-runtime';
import { EggQualifier, EggType, Inject, InjectOptional, LoadUnitInstanceLifecycleProto } from '@eggjs/core-decorator';
import { LifecyclePostInject, type LifecycleHook } from '@eggjs/lifecycle';
import type { LoadUnitInstance, LoadUnitInstanceLifecycleContext } from '@eggjs/tegg-runtime';

import type { EggMcpRouter } from './EggMcpRouter.ts';

@LoadUnitInstanceLifecycleProto({ name: 'mcpRegisterProvider' })
export class EggMCPRegisterProvider implements LifecycleHook<LoadUnitInstanceLifecycleContext, LoadUnitInstance> {
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
    this.controllerRegisterFactory.registerControllerRegister(ControllerType.MCP, (proto) => {
      this.#register ??= new MCPControllerRegister(mcpRouter);
      this.#register.addControllerProto(proto);
      return this.#register;
    });
  }

  async postCreate(_ctx: LoadUnitInstanceLifecycleContext, instance: LoadUnitInstance): Promise<void> {
    if (instance.loadUnit.type !== CONTROLLER_LOAD_UNIT) {
      return;
    }
    this.#register?.doRegister();
  }
}
