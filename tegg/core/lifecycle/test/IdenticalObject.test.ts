import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { IdenticalUtil } from '../src/index.js';

describe('test/IdenticalObject.test.ts', () => {
  it('should generate unique ctx id', () => {
    const traceId = 'mock_trace_id';
    const id1 = IdenticalUtil.createContextId(traceId);
    const id2 = IdenticalUtil.createContextId(traceId);
    assert(id1 !== id2);
  });

  it('should generate unique ctx id', () => {
    const id1 = IdenticalUtil.createContextId();
    const id2 = IdenticalUtil.createContextId();
    assert(id1 !== id2);
  });
});
