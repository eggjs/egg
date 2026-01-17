import { strict as assert } from 'assert';

import { describe, it } from 'vite-plus/test';

import { ImATeapotError, E418 } from '../../src/index.ts';

describe('test/http/418.test.ts', () => {
  it('should instantiate', () => {
    const err = new ImATeapotError();
    assert(err.code === 'IMA_TEAPOT');
    assert(err.message === "I'm a teapot");
    assert(err.name === 'ImATeapotError');
    assert(err.status === 418);
  });

  it('should alias to short name E418', () => {
    const err = new E418();
    assert(err.code === 'IMA_TEAPOT');
    assert(err.message === "I'm a teapot");
    assert(err.name === 'ImATeapotError');
    assert(err.status === 418);
  });
});
