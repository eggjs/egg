import { describe, it, expect } from '@voidzero-dev/vite-plus/test';

import { LogRotator } from '../src/index.ts';

describe('test/index.test.ts', () => {
  it('should export LogRotator', () => {
    expect(LogRotator).toBeDefined();
  });
});
