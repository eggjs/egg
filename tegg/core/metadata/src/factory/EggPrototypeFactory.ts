import { PrototypeUtil } from '@eggjs/core-decorator';
import { FrameworkErrorFormatter } from '@eggjs/errors';
import { MapUtil } from '@eggjs/tegg-common-util';
import { AccessLevel, TeggScope } from '@eggjs/tegg-types';
import type {
  EggProtoImplClass,
  EggPrototypeName,
  EggPrototype,
  EggPrototypeWithClazz,
  LoadUnit,
  QualifierInfo,
} from '@eggjs/tegg-types';

import { EggPrototypeNotFound, MultiPrototypeFound } from '../errors.ts';

const EGG_PROTOTYPE_FACTORY_SLOT = Symbol('tegg:metadata:eggPrototypeFactory');

export class EggPrototypeFactory {
  /**
   * Per-app prototype registry, resolved from the active TeggScope bag (lazily
   * created on first access), or the process-default bag in single-app mode.
   * Call sites stay unchanged — `EggPrototypeFactory.instance` now returns the
   * current app's registry instead of one process-global singleton.
   */
  public static get instance(): EggPrototypeFactory {
    return TeggScope.resolve(
      EGG_PROTOTYPE_FACTORY_SLOT,
      () => new EggPrototypeFactory(),
      'EggPrototypeFactory.instance',
    );
  }

  // Map<EggObjectInitTypeLike, Map<protoName, EggPrototype>>
  private publicProtoMap: Map<EggPrototypeName, EggPrototype[]> = new Map();

  /**
   * Per-app class → prototype map. The global `PrototypeUtil.getClazzProto()`
   * stores ONE proto per class on the class itself, so under CONCURRENT multi-app
   * boot two apps overwrite each other (last writer wins). This per-app map lets
   * `getEggObject(clazz)` resolve the CURRENT app's proto regardless.
   */
  private clazzProtoMap: WeakMap<EggProtoImplClass, EggPrototype> = new WeakMap();

  public registerPrototype(proto: EggPrototype, loadUnit: LoadUnit): void {
    const clazz = (proto as EggPrototypeWithClazz).clazz;
    if (clazz) {
      this.clazzProtoMap.set(clazz, proto);
    }
    if (proto.accessLevel === AccessLevel.PUBLIC) {
      const protoList = MapUtil.getOrStore(this.publicProtoMap, proto.name, []);
      protoList.push(proto);
    }
    loadUnit.registerEggPrototype(proto);
  }

  public deletePrototype(proto: EggPrototype, loadUnit: LoadUnit): void {
    const clazz = (proto as EggPrototypeWithClazz).clazz;
    if (clazz) {
      this.clazzProtoMap.delete(clazz);
    }
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

  /**
   * Resolve a prototype by its class from THIS app's registry. Preferred over
   * the global `PrototypeUtil.getClazzProto()` in multi-app scenarios.
   */
  public getPrototypeByClazz(clazz: EggProtoImplClass): EggPrototype | undefined {
    return this.clazzProtoMap.get(clazz);
  }

  /**
   * Resolve a proto by class from THIS app's registry, falling back to the
   * process-global `PrototypeUtil.getClazzProto()` map. Centralizes the rule-4
   * multi-app fallback so each call site does not re-implement (and risk
   * forgetting) it.
   */
  public getPrototypeByClazzOrGlobal(clazz: EggProtoImplClass): EggPrototype | undefined {
    return this.getPrototypeByClazz(clazz) ?? (PrototypeUtil.getClazzProto(clazz) as EggPrototype | undefined);
  }

  public getPrototype(name: PropertyKey, loadUnit?: LoadUnit, qualifiers?: QualifierInfo[]): EggPrototype {
    qualifiers = qualifiers || [];
    const protos = this.doGetPrototype(name, qualifiers, loadUnit);
    if (!protos.length) {
      throw FrameworkErrorFormatter.formatError(new EggPrototypeNotFound(name, loadUnit?.id));
    }
    if (protos.length === 1) {
      return protos[0];
    }
    throw FrameworkErrorFormatter.formatError(new MultiPrototypeFound(name, qualifiers));
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
    return protos?.filter((proto) => proto.verifyQualifiers(qualifiers)) || [];
  }
}
