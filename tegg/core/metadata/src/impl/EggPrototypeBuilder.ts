import assert from 'node:assert';

import { InjectType, PrototypeUtil, type QualifierAttribute, QualifierUtil } from '@eggjs/core-decorator';
import type {
  AccessLevel,
  EggProtoImplClass,
  EggPrototype,
  EggPrototypeLifecycleContext,
  EggPrototypeName,
  InjectConstructor,
  InjectObject,
  InjectObjectProto,
  LoadUnit,
  ObjectInitTypeLike,
  QualifierInfo,
} from '@eggjs/tegg-types';
import {
  DEFAULT_PROTO_IMPL_TYPE,
  InitTypeQualifierAttribute,
  type InjectConstructorProto,
  ObjectInitType,
} from '@eggjs/tegg-types';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';

import { EggPrototypeFactory, EggPrototypeCreatorFactory } from '../factory/index.ts';
import { EggPrototypeImpl } from './EggPrototypeImpl.ts';
import { EggPrototypeNotFound, MultiPrototypeFound } from '../errors.ts';

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

  static create(ctx: EggPrototypeLifecycleContext): EggPrototype {
    const { clazz, loadUnit } = ctx;
    const filepath = PrototypeUtil.getFilePath(clazz);
    assert(filepath, 'not find filepath');
    const builder = new EggPrototypeBuilder();
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
      ctx.prototypeInfo.qualifiers ?? []
    );
    builder.properQualifiers = ctx.prototypeInfo.properQualifiers ?? {};
    builder.multiInstanceConstructorIndex = PrototypeUtil.getMultiInstanceConstructorIndex(clazz);
    builder.multiInstanceConstructorAttributes = PrototypeUtil.getMultiInstanceConstructorAttributes(clazz);
    return builder.build();
  }

  private tryFindDefaultPrototype(injectObject: InjectObject | InjectConstructor): EggPrototype {
    const propertyQualifiers = QualifierUtil.getProperQualifiers(this.clazz, injectObject.refName);
    const multiInstancePropertyQualifiers = this.properQualifiers[injectObject.refName as string] ?? [];
    return EggPrototypeFactory.instance.getPrototype(
      injectObject.objName,
      this.loadUnit,
      QualifierUtil.mergeQualifiers(propertyQualifiers, multiInstancePropertyQualifiers)
    );
  }

  private tryFindContextPrototype(injectObject: InjectObject | InjectConstructor): EggPrototype {
    const propertyQualifiers = QualifierUtil.getProperQualifiers(this.clazz, injectObject.refName);
    const multiInstancePropertyQualifiers = this.properQualifiers[injectObject.refName as string] ?? [];
    return EggPrototypeFactory.instance.getPrototype(
      injectObject.objName,
      this.loadUnit,
      QualifierUtil.mergeQualifiers(propertyQualifiers, multiInstancePropertyQualifiers, [
        {
          attribute: InitTypeQualifierAttribute,
          value: ObjectInitType.CONTEXT,
        },
      ])
    );
  }

  private tryFindSelfInitTypePrototype(injectObject: InjectObject | InjectConstructor): EggPrototype {
    const propertyQualifiers = QualifierUtil.getProperQualifiers(this.clazz, injectObject.refName);
    const multiInstancePropertyQualifiers = this.properQualifiers[injectObject.refName as string] ?? [];
    return EggPrototypeFactory.instance.getPrototype(
      injectObject.objName,
      this.loadUnit,
      QualifierUtil.mergeQualifiers(propertyQualifiers, multiInstancePropertyQualifiers, [
        {
          attribute: InitTypeQualifierAttribute,
          value: this.initType,
        },
      ])
    );
  }

  private findInjectObjectPrototype(injectObject: InjectObject | InjectConstructor): EggPrototype {
    const propertyQualifiers = QualifierUtil.getProperQualifiers(this.clazz, injectObject.refName);
    try {
      return this.tryFindDefaultPrototype(injectObject);
    } catch (e) {
      if (
        !(e instanceof MultiPrototypeFound && !propertyQualifiers.find(t => t.attribute === InitTypeQualifierAttribute))
      ) {
        throw e;
      }
    }
    try {
      return this.tryFindContextPrototype(injectObject);
    } catch (e) {
      if (!(e instanceof EggPrototypeNotFound)) {
        throw e;
      }
    }
    return this.tryFindSelfInitTypePrototype(injectObject);
  }

  public build(): EggPrototype {
    const injectObjectProtos: Array<InjectObjectProto | InjectConstructorProto> = [];
    for (const injectObject of this.injectObjects) {
      const propertyQualifiers = QualifierUtil.getProperQualifiers(this.clazz, injectObject.refName);
      try {
        const proto = this.findInjectObjectPrototype(injectObject);
        let injectObjectProto: InjectObjectProto | InjectConstructorProto;
        if (this.injectType === InjectType.PROPERTY) {
          injectObjectProto = {
            refName: injectObject.refName,
            objName: injectObject.objName,
            qualifiers: propertyQualifiers,
            proto,
          };
        } else {
          injectObjectProto = {
            refIndex: (injectObject as InjectConstructor).refIndex,
            refName: injectObject.refName,
            objName: injectObject.objName,
            qualifiers: propertyQualifiers,
            proto,
          };
        }
        if (injectObject.optional) {
          injectObject.optional = true;
        }
        injectObjectProtos.push(injectObjectProto);
      } catch (e) {
        if (e instanceof EggPrototypeNotFound && injectObject.optional) {
          continue;
        }
        throw e;
      }
    }
    const id = IdenticalUtil.createProtoId(this.loadUnit.id, this.name);
    return new EggPrototypeImpl(
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
      this.multiInstanceConstructorAttributes
    );
  }
}

EggPrototypeCreatorFactory.registerPrototypeCreator(DEFAULT_PROTO_IMPL_TYPE, EggPrototypeBuilder.create);
