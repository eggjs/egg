'use strict';

exports.keys = 'debug-port-test';
exports.cluster = {
  listen: {
    hostname: process.env.EGG_TEST_CLUSTER_DEBUG_HOSTNAME || undefined,
  },
};
