import type { EggPlugin } from 'egg';

import developmentPlugin from '../../../../src/index.ts';

export default {
  ...developmentPlugin({
    enable: true,
  }),
} as EggPlugin;
