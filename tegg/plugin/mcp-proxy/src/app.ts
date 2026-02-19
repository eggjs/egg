import { MCPControllerRegister } from '@eggjs/controller-plugin/lib/impl/mcp/MCPControllerRegister';
import type { Application } from 'egg';

import { MCPProxyHook } from './index.ts';

export default class AppHook {
  private readonly agent: Application;

  constructor(agent: Application) {
    this.agent = agent;
  }

  configWillLoad() {
    MCPControllerRegister.addHook(MCPProxyHook);
  }

  async didLoad() {
    if ((this.agent as any).mcpProxy) {
      await ((this.agent as any).mcpProxy as any)?.ready();
    }
  }
}
