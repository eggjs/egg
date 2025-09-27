import type { EggCore } from '@eggjs/core';
import { DayRotator } from '../../lib/day_rotator.js';

export default (app: EggCore) => {
  const rotator = new DayRotator({ app });

  return {
    schedule: {
      type: 'worker', // only one worker run this task
      cron: '1 0 0 * * *', // run every day at 00:00
      disable: app.config.logrotator.disableRotateByDay,
    },

    async task() {
      await rotator.rotate();
    },
  };
};
