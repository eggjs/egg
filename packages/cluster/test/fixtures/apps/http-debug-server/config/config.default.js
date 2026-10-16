'use strict';

exports.keys = 'debug-port-test';
exports.cluster = {
  separateDebugServer: process.env.EGG_TEST_CLUSTER_SEPARATE_DEBUG_SERVER === 'true',
  listen: {
    hostname: process.env.EGG_TEST_CLUSTER_DEBUG_HOSTNAME || undefined,
  },
};
