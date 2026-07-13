import {
  AccessLevel,
  type EggPrototypeInfo,
  type ObjectInitTypeLike,
  type QualifierInfo,
} from '../../core-decorator/index.ts';
import { type ProtoDescriptorType } from '../enum/index.ts';

export type ProtoDescriptorTypeLike = ProtoDescriptorType | string;

export interface InjectObjectDescriptor {
  refName: PropertyKey;
  objName: PropertyKey;
  qualifiers: QualifierInfo[];
  // Spread from InjectObject/InjectConstructor when the descriptor is created.
  optional?: boolean;
}

export interface ProtoDescriptor extends EggPrototypeInfo {
  // base properties
  name: PropertyKey;
  accessLevel: AccessLevel;
  initType: ObjectInitTypeLike;
  qualifiers: QualifierInfo[];
  injectObjects: InjectObjectDescriptor[];
  protoImplType: string;
  properQualifiers: Record<PropertyKey, QualifierInfo[]>;

  // module info
  defineModuleName: string;
  defineUnitPath: string;
  // multi instance proto may be used in other module
  instanceModuleName: string;
  instanceDefineUnitPath: string;

  // test is the same proto
  equal(protoDescriptor: ProtoDescriptor): boolean;
}
