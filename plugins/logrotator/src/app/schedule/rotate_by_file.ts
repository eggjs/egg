import type { Application } from 'egg';

import { DayRotator } from '../../lib/day_rotator.ts';

interface ScheduleConfig {
  schedule: {
    type: string;
    cron: string;
    disable: boolean;
  };
  task(): Promise<void>;
}

export default (app: Application): ScheduleConfig => {
  const rotator = new DayRotator({ app });

  return {
    schedule: {
      type: 'worker', // only one worker run this task
      cron: '1 0 0 * * *', // run every day at 00:00
      disable: app.config.logrotator.disableRotateByDay,
    },

    async task(): Promise<void> {
      await rotator.rotate();
    },
  };
};
