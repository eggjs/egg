import { strict as assert } from 'node:assert';

import { describe, it } from 'vitest';

import { AgentConflictError, AgentNotFoundError } from '../src/index.ts';

describe('core/agent-runtime/test/errors.test.ts', () => {
  it('AgentNotFoundError should have status 404', () => {
    const err = new AgentNotFoundError('Thread t1 not found');
    assert(err instanceof Error);
    assert.equal(err.name, 'AgentNotFoundError');
    assert.equal(err.status, 404);
    assert.equal(err.message, 'Thread t1 not found');
  });

  it('AgentConflictError should have status 409', () => {
    const err = new AgentConflictError('Run r1 already completed');
    assert(err instanceof Error);
    assert.equal(err.name, 'AgentConflictError');
    assert.equal(err.status, 409);
    assert.equal(err.message, 'Run r1 already completed');
  });
});
