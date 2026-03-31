import type { EggLogger } from 'egg';
import { Base } from 'sdk-base';

export class MCPProxyDataClient extends Base {
  private readonly clients: Map<string, number>;
  private readonly logger: EggLogger;
  constructor(options: { logger: EggLogger }) {
    const superOptions = Object.assign(
      {},
      {
        initMethod: '_init',
      },
    );
    super(superOptions);
    this.clients = new Map();
    this.logger = options.logger;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async _init(): Promise<void> {}

  async registerClient(sessionId: string, pid: number): Promise<void> {
    if (this.clients.has(sessionId)) {
      const oldPid = this.clients.get(sessionId)!;
      this.logger.info('[MCPClientManager] duplicate register client %s new pid %s old pid', sessionId, pid, oldPid);
      this.clients.set(sessionId, pid);
    } else {
      this.logger.info('[MCPClientManager] register client %s pid %s', sessionId, pid);
      this.clients.set(sessionId, pid);
    }
  }

  async getClient(sessionId: string): Promise<number | undefined> {
    return this.clients.get(sessionId);
  }

  async unregisterClient(sessionId: string): Promise<void> {
    this.clients.delete(sessionId);
  }
}
