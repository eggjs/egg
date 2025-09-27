import { describe, it, expect } from 'vitest';

import { LogRotator } from '../src/index.ts';

describe('test/index.test.ts', () => {
  it('should export LogRotator', () => {
    expect(LogRotator).toBeDefined();
  });
});
