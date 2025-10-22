import { Inject, Logger } from 'egg';
import { CronParams, Schedule, ScheduleType } from 'egg/schedule';

@Schedule<CronParams>(
  {
    type: ScheduleType.WORKER,
    scheduleData: {
      // cron: '0 0 3 * * *',
      cron: '*/5 * * * * *',
      cronOptions: {
        tz: 'Asia/Shanghai',
      },
    },
  },
  {
    immediate: true,
    // disable: true,
    // env: ['local', 'unittest'],
  },
)
export class CronSubscriber {
  @Inject()
  private logger: Logger;

  async subscribe() {
    this.logger.info('cron schedule called');
  }
}
