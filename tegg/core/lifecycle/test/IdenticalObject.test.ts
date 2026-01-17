import { describe, it, expect } from 'vite-plus/test';

import { IdenticalUtil } from '../src/index.ts';

describe('test/IdenticalObject.test.ts', () => {
  it('should generate unique ctx id', () => {
    const traceId = 'mock_trace_id';
    const id1 = IdenticalUtil.createContextId(traceId);
    const id2 = IdenticalUtil.createContextId(traceId);
    expect(id1).not.toBe(id2);
  });

  it('should generate unique ctx id', () => {
    const id1 = IdenticalUtil.createContextId();
    const id2 = IdenticalUtil.createContextId();
    expect(id1).not.toBe(id2);
  });
});
