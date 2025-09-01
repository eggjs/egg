'use strict';

const workerThreads = require('worker_threads');

module.exports = () => {
  console.log('workerId: %d', workerThreads.threadId);
};
