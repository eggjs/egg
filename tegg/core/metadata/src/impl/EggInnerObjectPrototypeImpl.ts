import type { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-types';
import { EGG_INNER_OBJECT_PROTO_IMPL_TYPE } from '@eggjs/tegg-types';

import { EggPrototypeCreatorFactory } from '../factory/EggPrototypeCreatorFactory.ts';
import { EggPrototypeBuilder } from './EggPrototypeBuilder.ts';
import { EggPrototypeImpl } from './EggPrototypeImpl.ts';

export class EggInnerObjectPrototypeImpl extends EggPrototypeImpl {
  static create(ctx: EggPrototypeLifecycleContext): EggPrototype {
    return EggPrototypeBuilder.createWithProtoImpl(ctx, EggInnerObjectPrototypeImpl);
  }
}

EggPrototypeCreatorFactory.registerPrototypeCreator(
  EGG_INNER_OBJECT_PROTO_IMPL_TYPE,
  EggInnerObjectPrototypeImpl.create,
);
