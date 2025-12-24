import { describe, it, expect } from '@voidzero-dev/vite-plus/test';

import { Tracer } from '../src/index.ts';

describe('test/index.test.ts', () => {
  it('should work with lib', () => {
    expect(Tracer).toBeInstanceOf(Function);
  });
});
