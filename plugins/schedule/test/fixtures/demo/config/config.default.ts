import '../../../../src/index.js';

import type { EggAppConfig } from 'egg';

export default {
  schedule: {
    directory: ['path/to/otherSchedule'],
  },
} as Partial<EggAppConfig>;
