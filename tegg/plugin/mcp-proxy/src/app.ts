import { EggMcpRouter } from '@eggjs/controller-plugin/lib/impl/mcp/EggMcpRouter';
import { TeggScope } from '@eggjs/tegg-types';
import type { Application } from 'egg';

import { MCPProxyHook } from './index.ts';

export default class AppHook {
  private readonly agent: Application;

  constructor(agent: Application) {
    this.agent = agent;
  }

  configWillLoad(): void {
    // hooks is per-app (scope-backed); register into this app's scope.
    TeggScope.run(this.agent._teggScopeBag, () => EggMcpRouter.addHook(MCPProxyHook));
  }

  async didLoad(): Promise<void> {
    if ((this.agent as any).mcpProxy) {
      await ((this.agent as any).mcpProxy as any)?.ready();
    }
  }
}
