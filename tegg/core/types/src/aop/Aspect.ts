import type { EggProtoImplClass } from '../core-decorator/index.ts';
import type { IAdvice } from './Advice.ts';

export interface AdviceInfo {
  clazz: EggProtoImplClass<IAdvice>;
  order: number;
  adviceParams: any;
}

export interface AspectAdvice {
  name: string;
  clazz: EggProtoImplClass<IAdvice>;
  adviceParams: any;
}

export const ASPECT_LIST = Symbol.for('EggPrototype#aspectList');
