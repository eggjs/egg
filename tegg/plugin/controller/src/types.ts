import '@eggjs/tegg-plugin/types';
import type { ControllerMetaBuilderFactory } from '@eggjs/controller-decorator';
import type { ControllerRegisterFactory, RootProtoManager } from '@eggjs/controller-runtime';

import type { EggMcpRouter } from './lib/impl/mcp/EggMcpRouter.ts';

declare module 'egg' {
  interface Application {
    rootProtoManager: RootProtoManager;
    controllerRegisterFactory: ControllerRegisterFactory;
    controllerMetaBuilderFactory: typeof ControllerMetaBuilderFactory;
    // Mounted per app in the controller boot when the mcpProxy plugin is
    // enabled; injected into the mcpRegisterProvider via the egg compat proto.
    mcpRouter?: EggMcpRouter;
  }
}
