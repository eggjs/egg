import type { JSONPConfig } from '../types.js';

export default {
  jsonp: {
    limit: 50,
    callback: ['_callback', 'callback'],
    csrf: false,
    whiteList: undefined,
  } as JSONPConfig,
};
