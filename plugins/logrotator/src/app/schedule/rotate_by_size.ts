import type { Application } from 'egg';

import { SizeRotator } from '../../lib/size_rotator.ts';

interface ScheduleConfig {
  schedule: {
    type: string;
    interval: number | string;
    disable: boolean;
  };
  task(): Promise<void>;
}

export default (app: Application): ScheduleConfig => {
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
