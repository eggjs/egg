import { describe, it } from 'vitest';

import { strict as assert } from 'assert';
import { LoopDetectedError, E508 } from '../../src/index.ts';

describe('test/http/508.test.ts', () => {
  it('should instantiate', () => {
    const err = new LoopDetectedError();
    assert(err.code === 'LOOP_DETECTED');
    assert(err.message === 'Loop Detected');
    assert(err.name === 'LoopDetectedError');
    assert(err.status === 508);
  });

  it('should alias to short name E508', () => {
    const err = new E508();
    assert(err.code === 'LOOP_DETECTED');
    assert(err.message === 'Loop Detected');
    assert(err.name === 'LoopDetectedError');
    assert(err.status === 508);
  });
});
