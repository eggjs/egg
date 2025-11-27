import { ContextProto } from '@eggjs/core-decorator';
import { PointcutType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, IAdvice } from '@eggjs/tegg-types';

import { Advice, Crosscut } from '../../src/index.js';

@ContextProto()
export class CrosscutExample {
  constructor() {}

  hello(): void {
    console.log('hello');
  }
}

@Crosscut({
  type: PointcutType.CLASS,
  clazz: CrosscutExample,
  methodName: 'hello',
})
@Advice()
export class CrosscutClassAdviceExample implements IAdvice {}

@Crosscut({
  type: PointcutType.NAME,
  className: /crosscut.*/i,
  methodName: /hello/,
})
@Advice()
export class CrosscutNameAdviceExample implements IAdvice {}

@Crosscut({
  type: PointcutType.CUSTOM,
  callback: (clazz: EggProtoImplClass, method: PropertyKey) => {
    return clazz === CrosscutExample && method === 'hello';
  },
})
@Advice()
export class CrosscutCustomAdviceExample implements IAdvice {}
