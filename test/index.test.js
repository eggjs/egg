'use strict';

const assert = require('assert');
const egg = require('..');

describe('test/index.test.js', () => {
  it('should expose properties', () => {
    assert.deepEqual(Object.keys(egg).sort(), [
      'Agent',
      'AgentWorkerLoader',
      'AppWorkerLoader',
      'Application',
      'BaseContextClass',
      'Boot',
      'Controller',
      'Service',
      'Subscription',
      'start',
      'startCluster',
    ]);
  });
});
