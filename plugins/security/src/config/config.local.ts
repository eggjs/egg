import type { PartialEggConfig } from 'egg';

const config: PartialEggConfig = {
  security: {
    hsts: {
      enable: false,
    },
  },
};

export default config;
