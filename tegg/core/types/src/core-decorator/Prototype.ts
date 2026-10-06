import type { AccessLevel, ObjectInitTypeLike } from './enum/index.ts';

export interface PrototypeParams {
  name?: string;
  initType?: ObjectInitTypeLike;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}

export const DEFAULT_PROTO_IMPL_TYPE = 'DEFAULT';

export const EGG_INNER_OBJECT_PROTO_IMPL_TYPE = 'EGG_INNER_OBJECT_PROTOTYPE';
