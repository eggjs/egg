import { strict as assert } from 'assert';

import { describe, it } from '@voidzero-dev/vite-plus/test';

import { BadRequestError, E400 } from '../../src/index.ts';

describe('test/http/400.test.ts', () => {
  it('should instantiate', () => {
    const err = new BadRequestError();
    assert(err.code === 'BAD_REQUEST');
    assert(err.message === 'Bad Request');
    assert(err.name === 'BadRequestError');
    assert(err.status === 400);
  });

  it('should alias to short name E400', () => {
    const err = new E400();
    assert(err.code === 'BAD_REQUEST');
    assert(err.message === 'Bad Request');
    assert(err.name === 'BadRequestError');
    assert(err.status === 400);
  });
});
