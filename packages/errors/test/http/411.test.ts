import { strict as assert } from 'assert';

import { describe, it } from '@voidzero-dev/vite-plus/test';

import { LengthRequiredError, E411 } from '../../src/index.ts';

describe('test/http/411.test.ts', () => {
  it('should instantiate', () => {
    const err = new LengthRequiredError();
    assert(err.code === 'LENGTH_REQUIRED');
    assert(err.message === 'Length Required');
    assert(err.name === 'LengthRequiredError');
    assert(err.status === 411);
  });

  it('should alias to short name E411', () => {
    const err = new E411();
    assert(err.code === 'LENGTH_REQUIRED');
    assert(err.message === 'Length Required');
    assert(err.name === 'LengthRequiredError');
    assert(err.status === 411);
  });
});
