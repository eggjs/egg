import { debuglog } from 'node:util';

import {
  EggLoadUnitType,
  type EggLoadUnitTypeLike,
  type EggPrototype,
  EggPrototypeFactory,
  type Loader,
  type LoadUnit,
  LoadUnitFactory,
  type LoadUnitLifecycleContext,
  EggPrototypeCreatorFactory,
} from '@eggjs/tegg-metadata';
import {
  type EggPrototypeName,
  type QualifierInfo,
  PrototypeUtil,
  InitTypeQualifierAttribute,
  LoadUnitNameQualifierAttribute,
  QualifierUtil,
} from '@eggjs/core-decorator';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { type Id } from '@eggjs/tegg-types';
import { MapUtil } from '@eggjs/tegg-common-util';

const debug = debuglog('egg/tegg/plugin/tegg/lib/AppLoadUnit');

export class AppLoadUnit implements LoadUnit {
  private readonly loader: Loader;
  id: Id;
  readonly name: string;
  readonly type: EggLoadUnitTypeLike = EggLoadUnitType.APP;
  readonly unitPath: string;
  private protoMap: Map<EggPrototypeName, EggPrototype[]> = new Map();

  constructor(name: string, unitPath: string, loader: Loader) {
    this.id = IdenticalUtil.createLoadUnitId(name);
    this.name = name;
    this.unitPath = unitPath;
    this.loader = loader;
  }

  async init(): Promise<void> {
    const clazzList = await this.loader.load();
    if (debug.enabled) {
      debug(
        'init, get clazzList:%j, from unitPath:%o:%o:%o',
        clazzList.map((t) => t.name),
        this.type,
        this.name,
        this.unitPath,
      );
    }
    for (const clazz of clazzList) {
      // TODO duplicate code, same in ModuleLoadUnit
      const initTypeQualifierAttributeValue = await PrototypeUtil.getInitType(clazz, {
        unitPath: this.unitPath,
        moduleName: this.name,
      });
      const defaultQualifier = [
        {
          attribute: InitTypeQualifierAttribute,
          value: initTypeQualifierAttributeValue!,
        },
        {
          attribute: LoadUnitNameQualifierAttribute,
          value: this.name,
        },
      ];
      defaultQualifier.forEach((qualifier) => {
        QualifierUtil.addProtoQualifier(clazz, qualifier.attribute, qualifier.value);
      });
      const protos = await EggPrototypeCreatorFactory.createProto(clazz, this);
      for (const proto of protos) {
        EggPrototypeFactory.instance.registerPrototype(proto, this);
      }
    }
  }

  containPrototype(proto: EggPrototype): boolean {
    return !!this.protoMap.get(proto.name)?.find((t) => t === proto);
  }

  getEggPrototype(name: string, qualifiers: QualifierInfo[]): EggPrototype[] {
    const protos = this.protoMap.get(name);
    return protos?.filter((proto) => proto.verifyQualifiers(qualifiers)) || [];
  }

  registerEggPrototype(proto: EggPrototype): void {
    const protoList = MapUtil.getOrStore(this.protoMap, proto.name, []);
    protoList.push(proto);
  }

  deletePrototype(proto: EggPrototype): void {
    const protos = this.protoMap.get(proto.name);
    if (protos) {
      const index = protos.indexOf(proto);
      if (index !== -1) {
        protos.splice(index, 1);
      }
    }
  }

  async destroy(): Promise<void> {
    for (const namedProtos of this.protoMap.values()) {
      // Delete prototype will delete item
      // array iterator is not safe
      const protos = namedProtos.slice();
      for (const proto of protos) {
        EggPrototypeFactory.instance.deletePrototype(proto, this);
      }
    }
    this.protoMap.clear();
  }

  iterateEggPrototype(): IterableIterator<EggPrototype> {
    const protos: EggPrototype[] = Array.from(this.protoMap.values()).reduce((p, c) => {
      p = p.concat(c);
      return p;
    }, []);
    return protos.values();
  }

  static createModule(ctx: LoadUnitLifecycleContext): AppLoadUnit {
    return new AppLoadUnit('tegg-app', ctx.unitPath, ctx.loader);
  }
}

LoadUnitFactory.registerLoadUnitCreator(EggLoadUnitType.APP, AppLoadUnit.createModule);
