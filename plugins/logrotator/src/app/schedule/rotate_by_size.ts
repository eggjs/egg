import type { EggCore } from '@eggjs/core';
import { SizeRotator } from '../../lib/size_rotator.js';

export default (app: EggCore) => {
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
