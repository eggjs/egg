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
      'ClusterAgentWorkerError',
      'ClusterWorkerExceptionError',
      'Context',
      'Controller',
      'EggApplicationCore',
      'EggLogger',
      'Master',
      'Request',
      'Response',
      'Router',
      'Service',
      'Subscription',
      'start',
      'startCluster',
      'startEgg',
    ]);
  });
});
