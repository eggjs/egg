import type { EggPrototypeName } from '../../core-decorator/index.ts';
import type { ControllerTypeLike, MiddlewareFunc } from './types.ts';
import type { MethodMeta } from './MethodMeta.ts';

export interface ControllerMetadata {
  readonly protoName: EggPrototypeName;
  readonly controllerName: string;
  readonly className: string;
  readonly type: ControllerTypeLike;
  readonly methods: readonly MethodMeta[];
  readonly middlewares: readonly MiddlewareFunc[];
}
