import { strict as assert } from 'assert';

import { describe, it } from 'vitest';

import { PayloadTooLargeError, E413 } from '../../src/index.ts';

describe('test/http/413.test.ts', () => {
  it('should instantiate', () => {
    const err = new PayloadTooLargeError();
    assert(err.code === 'PAYLOAD_TOO_LARGE');
    assert(err.message === 'Payload Too Large');
    assert(err.name === 'PayloadTooLargeError');
    assert(err.status === 413);
  });

  it('should alias to short name E413', () => {
    const err = new E413();
    assert(err.code === 'PAYLOAD_TOO_LARGE');
    assert(err.message === 'Payload Too Large');
    assert(err.name === 'PayloadTooLargeError');
    assert(err.status === 413);
  });
});
