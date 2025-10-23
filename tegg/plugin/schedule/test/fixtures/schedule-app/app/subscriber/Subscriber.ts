import { Inject } from '@eggjs/tegg';
import { type EggLogger } from 'egg';
import { type IntervalParams, Schedule, ScheduleType } from '@eggjs/schedule-decorator';

@Schedule<IntervalParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    interval: 500,
  },
})
export class FooSubscriber {
  @Inject()
  private readonly logger: EggLogger;

  async subscribe(): Promise<void> {
    this.logger.info('schedule called');
    // console.warn('FooSubscriber schedule called');
  }
}
