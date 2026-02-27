import { ControllerMetaBuilderFactory, ControllerMetadataUtil } from '@eggjs/controller-decorator';
import type { LifecycleHook } from '@eggjs/lifecycle';
import type { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/metadata';

export class EggControllerPrototypeHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  async postCreate(ctx: EggPrototypeLifecycleContext): Promise<void> {
    // Enhance @AgentController classes with smart defaults before metadata build.
    if ((ctx.clazz as any)[Symbol.for('AGENT_CONTROLLER')]) {
      const { enhanceAgentController } = await import('@eggjs/agent-runtime');
      enhanceAgentController(ctx.clazz);
    }
    const metadata = ControllerMetaBuilderFactory.build(ctx.clazz);
    if (metadata) {
      ControllerMetadataUtil.setControllerMetadata(ctx.clazz, metadata);
    }
  }
}
