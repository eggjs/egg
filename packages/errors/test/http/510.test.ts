import { strict as assert } from 'assert';

import { describe, it } from '@voidzero-dev/vite-plus/test';

import { NotExtendedError, E510 } from '../../src/index.ts';

describe('test/http/510.test.ts', () => {
  it('should instantiate', () => {
    const err = new NotExtendedError();
    assert(err.code === 'NOT_EXTENDED');
    assert(err.message === 'Not Extended');
    assert(err.name === 'NotExtendedError');
    assert(err.status === 510);
  });

  it('should alias to short name E510', () => {
    const err = new E510();
    assert(err.code === 'NOT_EXTENDED');
    assert(err.message === 'Not Extended');
    assert(err.name === 'NotExtendedError');
    assert(err.status === 510);
  });
});
