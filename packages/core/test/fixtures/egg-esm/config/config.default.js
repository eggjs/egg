export default {
  coreMiddleware: ['status'],

  urllib: {
    keepAlive: true,
    keepAliveTimeout: 30000,
    timeout: 30000,
    maxSockets: Infinity,
    maxFreeSockets: 256,
  },

  egg: 'egg',
};
