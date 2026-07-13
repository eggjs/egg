import '@eggjs/tegg-plugin/types';
import type { ControllerMetaBuilderFactory } from '@eggjs/controller-decorator';
import type { RootProtoManager } from '@eggjs/controller-runtime';

import type { EggMcpRouter } from './lib/impl/mcp/EggMcpRouter.ts';

declare module 'egg' {
  interface Application {
    rootProtoManager: RootProtoManager;
    controllerMetaBuilderFactory: typeof ControllerMetaBuilderFactory;
    // Mounted per app in the controller boot when mcpProxy is enabled; the
    // mcpRegisterProvider injects it via the egg compat proto.
    mcpRouter?: EggMcpRouter;
  }
}
