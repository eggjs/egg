import { describe, it, expect } from 'vite-plus/test';

import { Tracer } from '../src/index.ts';

describe('test/index.test.ts', () => {
  it('should work with lib', () => {
    expect(Tracer).toBeInstanceOf(Function);
  });
});
