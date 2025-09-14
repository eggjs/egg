import '../../../../src/index.js';

import { EggAppConfig } from 'egg';

export default {
  keys: 'foo,bar',
  development: {
    fastReady: false,
  },
} as EggAppConfig;
