import { EggContainerFactory, EggObjectFactory as TEggObjectFactory } from '@eggjs/tegg-runtime';
import { IdenticalUtil } from '@eggjs/lifecycle';
import type { EggRuntimeContext, EggObject, EggObjectName, EggPrototype } from '@eggjs/tegg-types';

import { EggObjectFactory } from './EggObjectFactory.ts';
import { EggObjectFactoryPrototype } from './EggObjectFactoryPrototype.ts';

export class EggObjectFactoryObject implements EggObject {
  readonly proto: EggObjectFactoryPrototype;
  readonly name: EggObjectName;
  readonly ctx?: EggRuntimeContext;
  readonly id: string;
  #objFactory: EggObjectFactory;

  constructor(name: EggObjectName, proto: EggObjectFactoryPrototype) {
    this.proto = proto;
    this.name = name;
    this.id = IdenticalUtil.createObjectId(this.proto.id, this.ctx?.id);
  }

  get obj(): EggObjectFactory {
    if (!this.#objFactory) {
      this.#objFactory = this.proto.constructEggObject() as EggObjectFactory;
      this.#objFactory.eggContainerFactory = EggContainerFactory;
    }
    return this.#objFactory;
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
