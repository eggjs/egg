import { type QualifierInfo } from '@eggjs/tegg-types';

export interface ProtoSelectorContext {
  name: PropertyKey;
  qualifiers: QualifierInfo[];
  moduleName: string;
}
