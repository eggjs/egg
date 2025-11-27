import { strict as assert } from 'assert';

import { describe, it } from 'vitest';

import { TooManyRequestsError, E429 } from '../../src/index.ts';

describe('test/http/429.test.ts', () => {
  it('should instantiate', () => {
    const err = new TooManyRequestsError();
    assert(err.code === 'TOO_MANY_REQUESTS');
    assert(err.message === 'Too Many Requests');
    assert(err.name === 'TooManyRequestsError');
    assert(err.status === 429);
  });

  it('should alias to short name E429', () => {
    const err = new E429();
    assert(err.code === 'TOO_MANY_REQUESTS');
    assert(err.message === 'Too Many Requests');
    assert(err.name === 'TooManyRequestsError');
    assert(err.status === 429);
  });
});
