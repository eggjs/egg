import assert from 'node:assert';

import { type InjectType, PrototypeUtil, type QualifierAttribute, QualifierUtil } from '@eggjs/core-decorator';
import { IdenticalUtil } from '@eggjs/lifecycle';
import type {
  AccessLevel,
  EggProtoImplClass,
  EggPrototype,
  EggPrototypeLifecycleContext,
  EggPrototypeName,
  InjectConstructor,
  InjectConstructorProto,
  InjectObject,
  InjectObjectProto,
  LoadUnit,
  ObjectInitTypeLike,
  QualifierInfo,
} from '@eggjs/tegg-types';
import { DEFAULT_PROTO_IMPL_TYPE } from '@eggjs/tegg-types';

import { EggPrototypeCreatorFactory } from '../factory/index.ts';
import { EggPrototypeImpl } from './EggPrototypeImpl.ts';
import { InjectObjectPrototypeFinder } from './InjectObjectPrototypeFinder.ts';

export type EggPrototypeImplClass = new (
  id: string,
  name: EggPrototypeName,
  clazz: EggProtoImplClass,
  filepath: string,
  initType: ObjectInitTypeLike,
  accessLevel: AccessLevel,
  injectObjectProtos: Array<InjectObjectProto | InjectConstructorProto>,
  loadUnitId: string,
  qualifiers: QualifierInfo[],
  className?: string,
  injectType?: InjectType,
  multiInstanceConstructorIndex?: number,
  multiInstanceConstructorAttributes?: QualifierAttribute[],
) => EggPrototype;

export class EggPrototypeBuilder {
  private clazz: EggProtoImplClass;
  private name: EggPrototypeName;
  private initType: ObjectInitTypeLike;
  private accessLevel: AccessLevel;
  private filepath: string;
  private injectType: InjectType | undefined;
  private injectObjects: Array<InjectObject | InjectConstructor> = [];
  private loadUnit: LoadUnit;
  private qualifiers: QualifierInfo[] = [];
  private properQualifiers: Record<PropertyKey, QualifierInfo[]> = {};
  private className?: string;
  private multiInstanceConstructorIndex?: number;
  private multiInstanceConstructorAttributes?: QualifierAttribute[];
  private protoImplClass: EggPrototypeImplClass = EggPrototypeImpl;

  static create(ctx: EggPrototypeLifecycleContext): EggPrototype {
    return EggPrototypeBuilder.createWithProtoImpl(ctx, EggPrototypeImpl);
  }

  static createWithProtoImpl(ctx: EggPrototypeLifecycleContext, protoImplClass: EggPrototypeImplClass): EggPrototype {
    const { clazz, loadUnit } = ctx;
    const filepath = PrototypeUtil.getFilePath(clazz);
    assert(filepath, 'not find filepath');
    const builder = new EggPrototypeBuilder();
    builder.protoImplClass = protoImplClass;
    builder.clazz = clazz;
    builder.name = ctx.prototypeInfo.name;
    builder.className = ctx.prototypeInfo.className;
    builder.initType = ctx.prototypeInfo.initType;
    builder.accessLevel = ctx.prototypeInfo.accessLevel;
    builder.filepath = filepath!;
    builder.injectType = PrototypeUtil.getInjectType(clazz);
    builder.injectObjects = PrototypeUtil.getInjectObjects(clazz) || [];
    builder.loadUnit = loadUnit;
    builder.qualifiers = QualifierUtil.mergeQualifiers(
      QualifierUtil.getProtoQualifiers(clazz),
      ctx.prototypeInfo.qualifiers ?? [],
    );
    builder.properQualifiers = ctx.prototypeInfo.properQualifiers ?? {};
    builder.multiInstanceConstructorIndex = PrototypeUtil.getMultiInstanceConstructorIndex(clazz);
    builder.multiInstanceConstructorAttributes = PrototypeUtil.getMultiInstanceConstructorAttributes(clazz);
    return builder.build();
  }

  public build(): EggPrototype {
    const injectObjectProtos = InjectObjectPrototypeFinder.findInjectObjectPrototypes({
      clazz: this.clazz,
      loadUnit: this.loadUnit,
      properQualifiers: this.properQualifiers,
      initType: this.initType,
      injectType: this.injectType,
      injectObjects: this.injectObjects,
    });
    const id = IdenticalUtil.createProtoId(this.loadUnit.id, this.name);
    return new this.protoImplClass(
      id,
      this.name,
      this.clazz,
      this.filepath,
      this.initType,
      this.accessLevel,
      injectObjectProtos,
      this.loadUnit.id,
      this.qualifiers,
      this.className,
      this.injectType,
      this.multiInstanceConstructorIndex,
      this.multiInstanceConstructorAttributes,
    );
  }
}

EggPrototypeCreatorFactory.registerPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE, EggPrototypeBuilder.create);
