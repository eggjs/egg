import { strict as assert } from 'node:assert';
import * as egg from '../src/index.js';

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
