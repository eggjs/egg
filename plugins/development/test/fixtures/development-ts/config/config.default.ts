import '../../../../src/index.ts';

import type { EggAppConfig } from 'egg';

export default {
  keys: 'foo,bar',
  development: {
    fastReady: false,
  },
} as EggAppConfig;
