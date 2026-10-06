import assert from 'node:assert/strict';

import { Advice } from '@eggjs/aop-decorator';
import type { IAdvice } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { ControllerAdviceInfoUtil } from '../src/index.ts';

describe('ControllerAdviceInfoUtil', () => {
  it('identifies Advice classes', () => {
    @Advice()
    class TestAdvice implements IAdvice {}

    class OrdinaryAdvice implements IAdvice {}

    assert.equal(ControllerAdviceInfoUtil.isAdvice(TestAdvice), true);
    assert.equal(ControllerAdviceInfoUtil.isAdvice(OrdinaryAdvice), false);
  });
});
