import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { PrototypeUtil } from '../util/PrototypeUtil.ts';

/**
 * Mark a proto as a conditional default for its name: it is used only when it
 * is the sole candidate. If any other proto (plain or `@Override`) provides the
 * same name, this one is dropped from the graph (never instantiated) — the
 * "use me only if missing" default the framework provides so an app can replace
 * it just by declaring its own.
 *
 * ```ts
 * @ConditionalOnMissing()
 * @SingletonProto({ name: 'foo' })
 * class DefaultFoo {}
 * ```
 */
export function ConditionalOnMissing() {
  return function (clazz: EggProtoImplClass): void {
    PrototypeUtil.setConditionalOnMissing(clazz);
  };
}
