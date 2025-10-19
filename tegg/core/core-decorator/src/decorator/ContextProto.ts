import { AccessLevel, ObjectInitType } from '@eggjs/tegg-types';
import type { ContextProtoParams } from '@eggjs/tegg-types';

import { Prototype, type PrototypeDecorator } from './Prototype.ts';

export function ContextProto(params?: ContextProtoParams): PrototypeDecorator {
  return Prototype({
    initType: ObjectInitType.CONTEXT,
    accessLevel: params?.accessLevel || AccessLevel.PRIVATE,
    ...params,
  });
}
