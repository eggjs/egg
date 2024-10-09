import { strict as assert } from 'node:assert';
import * as egg from '../src/index.js';

describe('test/index.test.ts', () => {
  it('should expose properties', () => {
    assert.deepEqual(Object.keys(egg).sort(), [
      'Agent',
      'AgentWorkerLoader',
      'AppWorkerLoader',
      'Application',
      'BaseContextClass',
      'Boot',
      'Controller',
      'EggApplicationCore',
      'Service',
      'Subscription',
      'start',
      'startCluster',
      'startEgg',
    ]);
  });
});
