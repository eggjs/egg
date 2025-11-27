import type { EggProtoImplClass } from '@eggjs/core-decorator';
import type { EggPrototype } from '@eggjs/metadata';

export interface ModelProtoPair {
  proto: EggPrototype;
  clazz: EggProtoImplClass;
}

export class ModelProtoManager {
  private readonly protos: Array<ModelProtoPair> = [];

  addProto(clazz: EggProtoImplClass, proto: EggPrototype): void {
    this.protos.push({ proto, clazz });
  }

  getProtos(): Array<ModelProtoPair> {
    return this.protos.slice();
  }
}
