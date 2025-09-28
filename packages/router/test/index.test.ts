import { describe, it, expect } from 'vitest';

import Router, { KoaRouter, EggRouter } from '../src/index.ts';

describe('test/index.test.ts', () => {
  it('should expose Router', () => {
    expect(Router).toBeInstanceOf(Function);
    expect(KoaRouter).toBeInstanceOf(Function);
    // KoaRouter is alias of Router
    expect(KoaRouter).toBe(Router);
    expect(EggRouter).toBeInstanceOf(Function);
  });
});
