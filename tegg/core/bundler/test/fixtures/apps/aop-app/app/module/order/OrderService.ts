import { SingletonProto, AccessLevel, Inject } from '@eggjs/core-decorator';

import type { MetricsService } from './MetricsService.ts';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class OrderService {
  @Inject()
  private metricsService: MetricsService;

  async getOrder(id: string): Promise<{ id: string; amount: number }> {
    const start = Date.now();
    const result = { id, amount: 100 };
    await this.metricsService.record('getOrder', Date.now() - start);
    return result;
  }
}
