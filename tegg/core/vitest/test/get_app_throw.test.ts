import assert from 'assert';

import { describe, it, afterAll, vi } from 'vitest';

import { configureTeggRunner } from '../src/index.ts';

let getAppCalls = 0;
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

configureTeggRunner({
  getApp() {
    getAppCalls += 1;
    throw new Error('boom');
  },
  restoreMocks: false,
});

describe('getApp throw handling', () => {
  it('should not crash suite when getApp throws', () => {
    // The runner calls getApp in onBeforeRunSuite, so it should have been called
    assert(getAppCalls > 0);
    assert(warnSpy.mock.calls.length > 0);
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });
});
