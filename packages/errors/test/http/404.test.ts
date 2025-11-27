import { strict as assert } from 'assert';

import { describe, it } from 'vitest';

import { NotFoundError, E404 } from '../../src/index.ts';

describe('test/http/404.test.ts', () => {
  it('should instantiate', () => {
    const err = new NotFoundError();
    assert(err.code === 'NOT_FOUND');
    assert(err.message === 'Not Found');
    assert(err.name === 'NotFoundError');
    assert(err.status === 404);
  });

  it('should alias to short name E404', () => {
    const err = new E404();
    assert(err.code === 'NOT_FOUND');
    assert(err.message === 'Not Found');
    assert(err.name === 'NotFoundError');
    assert(err.status === 404);
  });
});
