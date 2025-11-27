import type { EggPrototype } from '@eggjs/metadata';
import { IdenticalUtil, type EggObjectName } from '@eggjs/tegg';
import { type EggObject, EggObjectFactory } from '@eggjs/tegg-runtime';

import { StandaloneInnerObjectProto } from './StandaloneInnerObjectProto.ts';

export class StandaloneInnerObject implements EggObject {
  readonly isReady: boolean = true;
  #obj: object;
  readonly proto: StandaloneInnerObjectProto;
  readonly name: EggObjectName;
  readonly id: string;

  constructor(name: EggObjectName, proto: StandaloneInnerObjectProto) {
    this.proto = proto;
    this.name = name;
    this.id = IdenticalUtil.createObjectId(this.proto.id);
  }

  get obj(): object {
    if (!this.#obj) {
      this.#obj = this.proto.constructEggObject();
    }
    return this.#obj;
  }

  injectProperty(): void {
    return;
  }

  static async createObject(name: EggObjectName, proto: EggPrototype): Promise<StandaloneInnerObject> {
    return new StandaloneInnerObject(name, proto as StandaloneInnerObjectProto);
  }
}

EggObjectFactory.registerEggObjectCreateMethod(StandaloneInnerObjectProto, StandaloneInnerObject.createObject);
