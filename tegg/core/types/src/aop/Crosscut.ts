import type { EggProtoImplClass } from '../core-decorator/index.ts';
import type { AdviceInfo } from './Aspect.ts';
import type { CustomPointcutCallback, PointcutInfo, PointcutType } from './Pointcut.ts';

export interface CrosscutOptions {
  // 默认值 100
  order?: number;
  adviceParams?: any;
}

// TODO type check for methodName
export interface ClassCrosscutParam {
  type: PointcutType.CLASS;
  clazz: EggProtoImplClass;
  methodName: PropertyKey;
}

export interface NameCrosscutParam {
  type: PointcutType.NAME;
  className: RegExp;
  methodName: RegExp;
}

export interface CustomCrosscutParam {
  type: PointcutType.CUSTOM;
  callback: CustomPointcutCallback;
}

export type CrosscutParam = ClassCrosscutParam | NameCrosscutParam | CustomCrosscutParam;

export const CROSSCUT_INFO_LIST = Symbol.for('EggPrototype#crosscutInfoList');
export const IS_CROSSCUT_ADVICE = Symbol.for('EggPrototype#isCrosscutAdvice');

export interface CrosscutInfo {
  pointcutInfo: PointcutInfo;
  adviceInfo: AdviceInfo;
}
