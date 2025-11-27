import { strict as assert } from 'assert';

import { describe, it } from 'vitest';

import { InternalServerError, E500 } from '../../src/index.ts';

describe('test/http/500.test.ts', () => {
  it('should instantiate', () => {
    const err = new InternalServerError();
    assert(err.code === 'INTERNAL_SERVER_ERROR');
    assert(err.message === 'Internal Server Error');
    assert(err.name === 'InternalServerError');
    assert(err.status === 500);
  });

  it('should alias to short name E500', () => {
    const err = new E500();
    assert(err.code === 'INTERNAL_SERVER_ERROR');
    assert(err.message === 'Internal Server Error');
    assert(err.name === 'InternalServerError');
    assert(err.status === 500);
  });
});
