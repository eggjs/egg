import { EggContainerFactory, EggObjectFactory as TEggObjectFactory } from '@eggjs/tegg-runtime';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import type { EggRuntimeContext, EggObject, EggObjectName, EggPrototype } from '@eggjs/tegg-types';
import { EggObjectFactory } from './EggObjectFactory.js';
import { EggObjectFactoryPrototype } from './EggObjectFactoryPrototype.js';

const OBJ = Symbol('EggObjectFactoryObject#obj');

export class EggObjectFactoryObject implements EggObject {
  readonly proto: EggObjectFactoryPrototype;
  readonly name: EggObjectName;
  readonly ctx?: EggRuntimeContext;
  readonly id: string;
  private [OBJ]: EggObjectFactory;

  constructor(name: EggObjectName, proto: EggObjectFactoryPrototype) {
    this.proto = proto;
    this.name = name;
    this.id = IdenticalUtil.createObjectId(this.proto.id, this.ctx?.id);
  }

  get obj() {
    if (!this[OBJ]) {
      this[OBJ] = this.proto.constructEggObject() as EggObjectFactory;
      this[OBJ].eggContainerFactory = EggContainerFactory;
    }
    return this[OBJ];
  }

  static async createObject(name: EggObjectName, proto: EggPrototype): Promise<EggObjectFactoryObject> {
    return new EggObjectFactoryObject(name, proto as EggObjectFactoryPrototype);
  }

  readonly isReady: true;

  injectProperty(): any {
    return;
  }
}

TEggObjectFactory.registerEggObjectCreateMethod(EggObjectFactoryPrototype, EggObjectFactoryObject.createObject);
