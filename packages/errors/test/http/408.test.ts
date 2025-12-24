import { strict as assert } from 'assert';

import { describe, it } from '@voidzero-dev/vite-plus/test';

import { RequestTimeoutError, E408 } from '../../src/index.ts';

describe('test/http/408.test.ts', () => {
  it('should instantiate', () => {
    const err = new RequestTimeoutError();
    assert(err.code === 'REQUEST_TIMEOUT');
    assert(err.message === 'Request Timeout');
    assert(err.name === 'RequestTimeoutError');
    assert(err.status === 408);
  });

  it('should alias to short name E408', () => {
    const err = new E408();
    assert(err.code === 'REQUEST_TIMEOUT');
    assert(err.message === 'Request Timeout');
    assert(err.name === 'RequestTimeoutError');
    assert(err.status === 408);
  });
});
