import type { EggProtoImplClass } from '../core-decorator/index.ts';

export interface PointcutOptions<K = any> {
  // default is 1000
  order?: number;
  adviceParams?: K;
}

export const PointcutType = {
  /**
   * use class type to match
   */
  CLASS: 'CLASS',
  /**
   * use regexp to match className and methodName
   */
  NAME: 'NAME',
  /**
   * use custom function to match
   */
  CUSTOM: 'CUSTOM',
} as const;
export type PointcutType = (typeof PointcutType)[keyof typeof PointcutType];

export interface PointcutInfo {
  type: PointcutType;

  match(clazz: EggProtoImplClass, method: PropertyKey): boolean;
}

export type CustomPointcutCallback = (clazz: EggProtoImplClass, method: PropertyKey) => boolean;

export const POINTCUT_ADVICE_INFO_LIAR: symbol = Symbol.for('EggPrototype#pointcutAdviceInfoList');
