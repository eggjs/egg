import assert from 'node:assert';

import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { MethodInfoUtil } from '../util/index.ts';

/**
 * @example
 * ```ts
 * import { InjectContext, Context } from 'egg';
 *
 * @HTTPController()
 * export class FooController {
 *   @HTTPMethod({
 *     path: '/foo',
 *     method: HTTPMethodEnum.GET,
 *   })
 * async bar(@InjectContext() ctx: Context, id: number): Promise<void> {
 *   console.log(ctx, id);
 * }
 * ```
 */
export function InjectContext() {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number): void {
    assert.equal(
      typeof propertyKey,
      'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`
    );
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    MethodInfoUtil.setMethodContextIndexInArgs(parameterIndex, controllerClazz, methodName);
  };
}

export {
  /**
   * @deprecated use {@link InjectContext} instead, keep compatible with tegg version 3.x
   */
  InjectContext as Context,
};
