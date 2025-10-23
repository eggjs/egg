import type { EggPlugin } from 'egg';

const plugin: EggPlugin = {
  tracer: {
    enable: true,
    package: '@eggjs/tracer',
  },
};

export default plugin;
