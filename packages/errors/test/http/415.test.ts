import { describe, it } from 'vitest';

import { strict as assert } from 'assert';
import { UnsupportedMediaTypeError, E415 } from '../../src/index.ts';

describe('test/http/415.test.ts', () => {
  it('should instantiate', () => {
    const err = new UnsupportedMediaTypeError();
    assert(err.code === 'UNSUPPORTED_MEDIA_TYPE');
    assert(err.message === 'Unsupported Media Type');
    assert(err.name === 'UnsupportedMediaTypeError');
    assert(err.status === 415);
  });

  it('should alias to short name E415', () => {
    const err = new E415();
    assert(err.code === 'UNSUPPORTED_MEDIA_TYPE');
    assert(err.message === 'Unsupported Media Type');
    assert(err.name === 'UnsupportedMediaTypeError');
    assert(err.status === 415);
  });
});
