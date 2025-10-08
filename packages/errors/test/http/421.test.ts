import { describe, it } from 'vitest';

import { strict as assert } from 'assert';
import { MisdirectedRequestError, E421 } from '../../src/index.ts';

describe('test/http/421.test.ts', () => {
  it('should instantiate', () => {
    const err = new MisdirectedRequestError();
    assert(err.code === 'MISDIRECTED_REQUEST');
    assert(err.message === 'Misdirected Request');
    assert(err.name === 'MisdirectedRequestError');
    assert(err.status === 421);
  });

  it('should alias to short name E421', () => {
    const err = new E421();
    assert(err.code === 'MISDIRECTED_REQUEST');
    assert(err.message === 'Misdirected Request');
    assert(err.name === 'MisdirectedRequestError');
    assert(err.status === 421);
  });
});
