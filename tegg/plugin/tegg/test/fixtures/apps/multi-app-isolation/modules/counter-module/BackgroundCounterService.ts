import { AccessLevel, BackgroundTaskHelper, ContextProto, Inject } from '@eggjs/tegg';

import { CounterService } from './CounterService.ts';

/**
 * Context-scoped service that schedules a background task (timer/async escape
 * point). The task callback resolves the per-app CounterService and must hit the
 * scheduling app's instance, even though it runs after the request returns.
 */
@ContextProto({ accessLevel: AccessLevel.PUBLIC })
export class BackgroundCounterService {
  @Inject()
  private readonly backgroundTaskHelper: BackgroundTaskHelper;

  @Inject()
  private readonly counterService: CounterService;

  schedule(times: number): void {
    const counterService = this.counterService;
    this.backgroundTaskHelper.run(async () => {
      // Yield first so the increments run AFTER the scheduling context has
      // exited — i.e. truly across the async/background boundary, which is what
      // the multi-app background-task isolation test means to exercise.
      await new Promise((resolve) => setImmediate(resolve));
      for (let i = 0; i < times; i++) {
        counterService.increment();
      }
    });
  }
}
