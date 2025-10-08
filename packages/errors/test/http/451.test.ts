import { describe, it } from 'vitest';

import { strict as assert } from 'assert';
import { UnavailableForLegalReasonsError, E451 } from '../../src/index.ts';

describe('test/http/451.test.ts', () => {
  it('should instantiate', () => {
    const err = new UnavailableForLegalReasonsError();
    assert(err.code === 'UNAVAILABLE_FOR_LEGAL_REASONS');
    assert(err.message === 'Unavailable For Legal Reasons');
    assert(err.name === 'UnavailableForLegalReasonsError');
    assert(err.status === 451);
  });

  it('should alias to short name E451', () => {
    const err = new E451();
    assert(err.code === 'UNAVAILABLE_FOR_LEGAL_REASONS');
    assert(err.message === 'Unavailable For Legal Reasons');
    assert(err.name === 'UnavailableForLegalReasonsError');
    assert(err.status === 451);
  });
});
