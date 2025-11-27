import { type EggObjectName, EggType, EggQualifierAttribute } from '@eggjs/core-decorator';
import { IdenticalUtil } from '@eggjs/lifecycle';
import type { EggPrototype } from '@eggjs/metadata';
import { type EggObject, EggObjectFactory } from '@eggjs/tegg-runtime';

import { EggCompatibleProtoImpl } from './EggCompatibleProtoImpl.ts';

// const OBJ = Symbol('EggCompatibleObject#obj');

export class EggCompatibleObject implements EggObject {
  readonly isReady: boolean = true;
  // private [OBJ]: object;
  #obj: object;
  readonly proto: EggCompatibleProtoImpl;
  readonly name: EggObjectName;
  readonly id: string;
  readonly isContext: boolean;

  constructor(name: EggObjectName, proto: EggCompatibleProtoImpl) {
    this.proto = proto;
    this.name = name;
    this.id = IdenticalUtil.createObjectId(this.proto.id);
    this.isContext = this.proto.verifyQualifier({
      value: EggType.CONTEXT,
      attribute: EggQualifierAttribute,
    });
  }

  // If the egg object is a getter,
  // access may have side effect.
  // So access egg object lazy.
  get obj(): object {
    if (this.isContext) {
      return this.proto.constructEggObject();
    }
    if (!this.#obj) {
      this.#obj = this.proto.constructEggObject();
    }
    return this.#obj;
  }

  injectProperty(): void {
    return;
  }

  static async createObject(name: EggObjectName, proto: EggPrototype): Promise<EggCompatibleObject> {
    return new EggCompatibleObject(name, proto as EggCompatibleProtoImpl);
  }
}

EggObjectFactory.registerEggObjectCreateMethod(EggCompatibleProtoImpl, EggCompatibleObject.createObject);
