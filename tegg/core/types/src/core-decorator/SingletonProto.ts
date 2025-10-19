import type { AccessLevel } from './enum/index.ts';

export interface SingletonProtoParams {
  name?: string;
  accessLevel?: AccessLevel;
  protoImplType?: string;
}
