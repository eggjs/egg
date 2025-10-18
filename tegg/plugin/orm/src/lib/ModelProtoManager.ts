import { type EggPrototype } from '@eggjs/tegg-metadata';
import { type EggProtoImplClass } from '@eggjs/tegg';

export interface ModelProtoPair {
  proto: EggPrototype;
  clazz: EggProtoImplClass;
}

export class ModelProtoManager {
  private readonly protos: Array<ModelProtoPair> = [];

  addProto(clazz: EggProtoImplClass, proto: EggPrototype) {
    this.protos.push({ proto, clazz });
  }

  getProtos(): Array<ModelProtoPair> {
    return this.protos.slice();
  }
}
