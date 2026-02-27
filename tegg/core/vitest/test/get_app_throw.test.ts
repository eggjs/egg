import assert from 'assert';

import { describe, it } from 'vitest';

import { configureTeggRunner } from '../src/index.ts';

let getAppCalls = 0;

configureTeggRunner({
  getApp() {
    getAppCalls += 1;
    throw new Error('boom');
  },
  restoreMocks: false,
});

describe('getApp throw handling', () => {
  it('should not crash suite when getApp throws', () => {
    // The runner calls getApp during importFile (collection phase),
    // so it should have been called and the error handled gracefully.
    assert(getAppCalls > 0);
  });
});
