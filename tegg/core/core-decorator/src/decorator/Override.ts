import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { PrototypeUtil } from '../util/PrototypeUtil.ts';

/**
 * Mark a proto as an explicit override for its name: it deterministically wins
 * over a same-name plain proto or a `@ConditionalOnMissing` default, and the
 * losers are dropped from the graph (never instantiated).
 *
 * Put it next to the proto decorator:
 * ```ts
 * @Override()
 * @SingletonProto({ name: 'foo' })
 * class MyFoo {}
 * ```
 */
export function Override() {
  return function (clazz: EggProtoImplClass): void {
    PrototypeUtil.setOverride(clazz);
  };
}
