import type { PartialEggConfig } from 'egg';

export default {
  security: {
    hsts: {
      enable: false,
    },
  },
} as PartialEggConfig;
