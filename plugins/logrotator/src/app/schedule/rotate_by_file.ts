import type { Application } from 'egg';
import type { EggScheduleHandler } from 'egg/schedule';

import { DayRotator } from '../../lib/day_rotator.ts';

export default (app: Application): EggScheduleHandler => {
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
