import type { Application } from 'egg';

export default class AppHook {
  private readonly agent: Application;

  constructor(agent: Application) {
    this.agent = agent;
  }

  async didLoad(): Promise<void> {
    if ((this.agent as any).mcpProxy) {
      await ((this.agent as any).mcpProxy as any)?.ready();
    }
  }
}
