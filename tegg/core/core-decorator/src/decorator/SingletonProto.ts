import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';
import type { SingletonProtoParams } from '@eggjs/tegg-types';

import { Prototype } from './Prototype.ts';

export function SingletonProto(params?: SingletonProtoParams) {
  return Prototype({
    initType: ObjectInitType.SINGLETON,
    accessLevel: params?.accessLevel || AccessLevel.PRIVATE,
    ...params,
  });
}
