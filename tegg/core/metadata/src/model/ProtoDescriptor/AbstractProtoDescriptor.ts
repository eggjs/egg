import {
  AccessLevel,
  type InjectObjectDescriptor,
  type ObjectInitTypeLike,
  type ProtoDescriptor,
  type ProtoDescriptorTypeLike,
  type QualifierInfo,
} from '@eggjs/tegg-types';

export interface AbstractProtoDescriptorOptions {
  name: PropertyKey;
  accessLevel: AccessLevel;
  initType: ObjectInitTypeLike;
  qualifiers: QualifierInfo[];
  protoImplType: string;
  injectObjects: InjectObjectDescriptor[];
  defineModuleName: string;
  defineUnitPath: string;
  instanceModuleName: string;
  instanceDefineUnitPath: string;
  type: ProtoDescriptorTypeLike;
  properQualifiers: Record<PropertyKey, QualifierInfo[]>;
}

export abstract class AbstractProtoDescriptor implements ProtoDescriptor {
  name: PropertyKey;
  accessLevel: AccessLevel;
  initType: ObjectInitTypeLike;
  qualifiers: QualifierInfo[];
  injectObjects: InjectObjectDescriptor[];
  protoImplType: string;
  defineModuleName: string;
  defineUnitPath: string;
  instanceModuleName: string;
  instanceDefineUnitPath: string;
  className?: string;
  properQualifiers: Record<PropertyKey, QualifierInfo[]>;
  type: ProtoDescriptorTypeLike;

  protected constructor(options: AbstractProtoDescriptorOptions) {
    this.name = options.name;
    this.accessLevel = options.accessLevel;
    this.initType = options.initType;
    this.qualifiers = options.qualifiers;
    this.protoImplType = options.protoImplType;
    this.injectObjects = options.injectObjects;
    this.defineModuleName = options.defineModuleName;
    this.defineUnitPath = options.defineUnitPath;
    this.instanceModuleName = options.instanceModuleName;
    this.instanceDefineUnitPath = options.instanceDefineUnitPath;
    this.type = options.type;
    this.properQualifiers = options.properQualifiers;
  }

  abstract equal(protoDescriptor: ProtoDescriptor): boolean;
}
