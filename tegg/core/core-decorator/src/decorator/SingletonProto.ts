import type { SingletonProtoParams } from '@eggjs/tegg-types';
import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';

import { Prototype, type PrototypeDecorator } from './Prototype.ts';

export function SingletonProto(params?: SingletonProtoParams): PrototypeDecorator {
  return Prototype({
    initType: ObjectInitType.SINGLETON,
    accessLevel: params?.accessLevel || AccessLevel.PRIVATE,
    ...params,
  });
}
