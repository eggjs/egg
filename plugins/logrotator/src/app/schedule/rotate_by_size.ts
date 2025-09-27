import type { Application } from 'egg';

import { SizeRotator } from '../../lib/size_rotator.ts';

export default (app: Application) => {
  const rotator = new SizeRotator({ app });

  return {
    schedule: {
      type: 'worker',
      interval: app.config.logrotator.rotateDuration,
      disable: (app.config.logrotator.filesRotateBySize || []).length === 0,
    },

    async task() {
      await rotator.rotate();
    },
  };
};
