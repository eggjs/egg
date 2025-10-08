import { describe, it } from 'vitest';

import { strict as assert } from 'assert';
import { ExpectationFailedError, E417 } from '../../src/index.ts';

describe('test/http/417.test.ts', () => {
  it('should instantiate', () => {
    const err = new ExpectationFailedError();
    assert(err.code === 'EXPECTATION_FAILED');
    assert(err.message === 'Expectation Failed');
    assert(err.name === 'ExpectationFailedError');
    assert(err.status === 417);
  });

  it('should alias to short name E417', () => {
    const err = new E417();
    assert(err.code === 'EXPECTATION_FAILED');
    assert(err.message === 'Expectation Failed');
    assert(err.name === 'ExpectationFailedError');
    assert(err.status === 417);
  });
});
