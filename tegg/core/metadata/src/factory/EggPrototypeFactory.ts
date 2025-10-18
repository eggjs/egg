import { MapUtil } from '@eggjs/tegg-common-util';
import { AccessLevel } from '@eggjs/tegg-types';
import type { EggPrototypeName, EggPrototype, LoadUnit, QualifierInfo } from '@eggjs/tegg-types';
import { FrameworkErrorFormater } from 'egg-errors';

import { EggPrototypeNotFound, MultiPrototypeFound } from '../errors.ts';

export class EggPrototypeFactory {
  public static instance = new EggPrototypeFactory();

  // Map<EggObjectInitTypeLike, Map<protoName, EggPrototype>>
  private publicProtoMap: Map<EggPrototypeName, EggPrototype[]> = new Map();

  public registerPrototype(proto: EggPrototype, loadUnit: LoadUnit) {
    if (proto.accessLevel === AccessLevel.PUBLIC) {
      const protoList = MapUtil.getOrStore(this.publicProtoMap, proto.name, []);
      protoList.push(proto);
    }
    loadUnit.registerEggPrototype(proto);
  }

  public deletePrototype(proto: EggPrototype, loadUnit: LoadUnit) {
    if (proto.accessLevel === AccessLevel.PUBLIC) {
      const protos = this.publicProtoMap.get(proto.name);
      if (protos) {
        const index = protos.indexOf(proto);
        if (index !== -1) {
          protos.splice(index, 1);
        }
      }
    }

    loadUnit.deletePrototype(proto);
  }

  public getPrototype(name: PropertyKey, loadUnit?: LoadUnit, qualifiers?: QualifierInfo[]): EggPrototype {
    qualifiers = qualifiers || [];
    const protos = this.doGetPrototype(name, qualifiers, loadUnit);
    if (!protos.length) {
      throw FrameworkErrorFormater.formatError(new EggPrototypeNotFound(name, loadUnit?.id));
    }
    if (protos.length === 1) {
      return protos[0];
    }
    throw FrameworkErrorFormater.formatError(new MultiPrototypeFound(name, qualifiers));
  }

  private doGetPrototype(name: EggPrototypeName, qualifiers: QualifierInfo[], loadUnit?: LoadUnit): EggPrototype[] {
    if (loadUnit) {
      // 1. find private proto in load unit
      const protos = loadUnit.getEggPrototype(name, qualifiers);
      if (protos.length) {
        return protos;
      }
    }

    // 2. find public proto in global
    const protos = this.publicProtoMap.get(name);
    return protos?.filter(proto => proto.verifyQualifiers(qualifiers)) || [];
  }
}
