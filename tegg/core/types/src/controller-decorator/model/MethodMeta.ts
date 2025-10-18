import type { MiddlewareFunc } from './types.ts';

export interface MethodMeta {
  readonly name: string;
  readonly middlewares: readonly MiddlewareFunc[];
  readonly contextParamIndex: number | undefined;
}
