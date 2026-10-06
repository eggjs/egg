import type { EggPrototypeName, QualifierInfo } from '@eggjs/core-decorator';
import { IdenticalUtil } from '@eggjs/lifecycle';
import {
  type EggPrototype,
  EggPrototypeFactory,
  type Loader,
  type LoadUnit,
  type EggPrototypeCreatorFactory,
} from '@eggjs/metadata';
import { MapUtil } from '@eggjs/tegg-common-util';
import type { Id } from '@eggjs/tegg-types';

export const CONTROLLER_LOAD_UNIT = 'app#controller';

// ControllerLoadUnit is responsible for manage controller proto
export class ControllerLoadUnit implements LoadUnit {
  private readonly loader: Loader;
  id: Id;
  readonly name: string;
  readonly type: string = CONTROLLER_LOAD_UNIT;
  readonly unitPath: string;
  private eggPrototypeFactory: EggPrototypeFactory;
  private eggPrototypeCreatorFactory: typeof EggPrototypeCreatorFactory;
  private protoMap: Map<EggPrototypeName, EggPrototype[]> = new Map();

  constructor(
    name: string,
    unitPath: string,
    loader: Loader,
    eggPrototypeFactory: EggPrototypeFactory,
    eggPrototypeCreatorFactory: typeof EggPrototypeCreatorFactory,
  ) {
    this.id = IdenticalUtil.createLoadUnitId(name);
    this.name = name;
    this.unitPath = unitPath;
    this.loader = loader;
    this.eggPrototypeFactory = eggPrototypeFactory;
    this.eggPrototypeCreatorFactory = eggPrototypeCreatorFactory;
  }

  async init(): Promise<void> {
    const clazzList = await this.loader.load();
    for (const clazz of clazzList) {
      const protos = await this.eggPrototypeCreatorFactory.createProto(clazz, this);
      for (const proto of protos) {
        this.eggPrototypeFactory.registerPrototype(proto, this);
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
}
