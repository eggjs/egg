import { InnerObjectProto } from '@eggjs/core-decorator';
import { ObjectInitType } from '@eggjs/tegg-types';
import type { EggPrototype } from '@eggjs/tegg-types';

export interface ProtoToCreate {
  name: string;
  proto: EggPrototype;
}

@InnerObjectProto()
export class AopContextAdviceRegistry {
  readonly #requestProtoList: ProtoToCreate[] = [];

  addAdvice(name: string, proto: EggPrototype): void {
    if (proto.initType !== ObjectInitType.CONTEXT) {
      return;
    }
    if (this.#requestProtoList.some((t) => t.name === name && t.proto === proto)) {
      return;
    }
    this.#requestProtoList.push({ name, proto });
  }

  getRequestProtos(): readonly ProtoToCreate[] {
    return this.#requestProtoList;
  }
}
