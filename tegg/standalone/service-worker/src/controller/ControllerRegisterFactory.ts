import { ControllerMetadata, ControllerTypeLike } from '@eggjs/tegg';
import { EggPrototype } from '@eggjs/tegg/helper';
import { ControllerRegister } from './ControllerRegister.ts';

export type RegisterCreator = (proto: EggPrototype, controllerMeta: ControllerMetadata) => ControllerRegister;

export class ControllerRegisterFactory {
  #registerCreatorMap: Map<ControllerTypeLike, RegisterCreator>;

  constructor() {
    this.#registerCreatorMap = new Map();
  }

  registerControllerRegister(type: ControllerTypeLike, creator: RegisterCreator) {
    this.#registerCreatorMap.set(type, creator);
  }

  getControllerRegister(proto: EggPrototype, metadata: ControllerMetadata): ControllerRegister | undefined {
    const creator = this.#registerCreatorMap.get(metadata.type);
    if (!creator) {
      return;
    }
    return creator(proto, metadata);
  }
}
