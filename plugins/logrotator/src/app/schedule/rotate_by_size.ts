import type { Application } from 'egg';
import type { EggScheduleHandler } from 'egg/schedule';

import { SizeRotator } from '../../lib/size_rotator.ts';

export default (app: Application): EggScheduleHandler => {
  const rotator = new SizeRotator({ app });

  return {
    schedule: {
      type: 'worker',
      interval: app.config.logrotator.rotateDuration,
      disable: (app.config.logrotator.filesRotateBySize || []).length === 0,
    },

    async task(): Promise<void> {
      await rotator.rotate();
    },
  };
};
