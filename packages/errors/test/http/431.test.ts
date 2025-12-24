import { strict as assert } from 'assert';

import { describe, it } from '@voidzero-dev/vite-plus/test';

import { RequestHeaderFieldsTooLargeError, E431 } from '../../src/index.ts';

describe('test/http/431.test.ts', () => {
  it('should instantiate', () => {
    const err = new RequestHeaderFieldsTooLargeError();
    assert(err.code === 'REQUEST_HEADER_FIELDS_TOO_LARGE');
    assert(err.message === 'Request Header Fields Too Large');
    assert(err.name === 'RequestHeaderFieldsTooLargeError');
    assert(err.status === 431);
  });

  it('should alias to short name E431', () => {
    const err = new E431();
    assert(err.code === 'REQUEST_HEADER_FIELDS_TOO_LARGE');
    assert(err.message === 'Request Header Fields Too Large');
    assert(err.name === 'RequestHeaderFieldsTooLargeError');
    assert(err.status === 431);
  });
});
