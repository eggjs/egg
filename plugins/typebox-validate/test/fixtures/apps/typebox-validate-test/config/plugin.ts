import type { EggPlugin } from 'egg';

const plugin: EggPlugin = {
  typeboxValidate: {
    enable: true,
    package: '@eggjs/typebox-validate',
  },
};

export default plugin;
