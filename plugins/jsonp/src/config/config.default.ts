import type { PartialEggConfig } from 'egg';

export default {
  jsonp: {
    limit: 50,
    callback: ['_callback', 'callback'],
    csrf: false,
    whiteList: undefined,
  },
} as PartialEggConfig;
