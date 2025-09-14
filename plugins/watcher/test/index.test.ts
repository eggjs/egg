import { describe, it } from 'vitest';
import { strict as assert } from 'node:assert';
import * as watcher from '../src/index.js';

describe('test/index.test.ts', () => {
  it('should exports work', async () => {
    assert.deepEqual(Object.keys(watcher), [
      'BaseEventSource',
      'DefaultEventSource',
      'DevelopmentEventSource',
      'Watcher',
    ]);
  });
});
