import { Inject, Logger } from 'egg';
import { IntervalParams, Schedule, ScheduleType } from 'egg/schedule'; // 每 1000ms 执行一次

@Schedule<IntervalParams>({
  type: ScheduleType.WORKER,
  scheduleData: {
    interval: 1000,
  },
  // interval: '5s', // 每 5s 执行一次
})
export class IntervalScheduler {
  @Inject()
  private logger: Logger;

  async subscribe() {
    this.logger.info('schedule called');
  }
}
