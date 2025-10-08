import { describe, it } from 'vitest';

import { strict as assert } from 'assert';
import { GoneError, E410 } from '../../src/index.ts';

describe('test/http/410.test.ts', () => {
  it('should instantiate', () => {
    const err = new GoneError();
    assert(err.code === 'GONE');
    assert(err.message === 'Gone');
    assert(err.name === 'GoneError');
    assert(err.status === 410);
  });

  it('should alias to short name E410', () => {
    const err = new E410();
    assert(err.code === 'GONE');
    assert(err.message === 'Gone');
    assert(err.name === 'GoneError');
    assert(err.status === 410);
  });
});
