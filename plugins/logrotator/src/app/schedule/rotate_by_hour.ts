import type { Application } from 'egg';

import { HourRotator } from '../../lib/hour_rotator.ts';

export default (app: Application) => {
  const rotator = new HourRotator({ app });

  return {
    schedule: {
      type: 'worker', // only one worker run this task
      cron: '1 * * * *', // run every hour at 01
      disable: (app.config.logrotator.filesRotateByHour || []).length === 0,
    },

    async task() {
      await rotator.rotate();
    },
  };
};
