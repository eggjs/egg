import { strict as assert } from 'assert';

import { describe, it } from 'vitest';

import { NotImplementedError, E501 } from '../../src/index.ts';

describe('test/http/501.test.ts', () => {
  it('should instantiate', () => {
    const err = new NotImplementedError();
    assert(err.code === 'NOT_IMPLEMENTED');
    assert(err.message === 'Not Implemented');
    assert(err.name === 'NotImplementedError');
    assert(err.status === 501);
  });

  it('should alias to short name E501', () => {
    const err = new E501();
    assert(err.code === 'NOT_IMPLEMENTED');
    assert(err.message === 'Not Implemented');
    assert(err.name === 'NotImplementedError');
    assert(err.status === 501);
  });
});
