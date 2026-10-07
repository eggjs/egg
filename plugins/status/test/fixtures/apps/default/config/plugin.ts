import statusPlugin from '@eggjs/status';
import type { EggPlugin } from 'egg';

const plugin: EggPlugin = {
  ...statusPlugin(),
};

export default plugin;
