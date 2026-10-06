import type { ControllerMetadata, ControllerTypeLike } from '@eggjs/controller-decorator';
import { InnerObjectProto } from '@eggjs/core-decorator';
import type { EggPrototype } from '@eggjs/metadata';

import type { ControllerRegister } from './ControllerRegister.ts';

/** Creates the register implementation for each controller type. */
export type RegisterCreator<THost = unknown> = (
  proto: EggPrototype,
  controllerMeta: ControllerMetadata,
  host: THost,
) => ControllerRegister;

@InnerObjectProto()
export class ControllerRegisterFactory<THost = unknown> {
  private readonly host: THost;
  private registerCreatorMap: Map<ControllerTypeLike, RegisterCreator<THost>>;

  constructor(host?: THost) {
    this.host = host as THost;
    this.registerCreatorMap = new Map();
  }

  registerControllerRegister(type: ControllerTypeLike, creator: RegisterCreator<THost>): void {
    this.registerCreatorMap.set(type, creator);
  }

  getControllerRegister(proto: EggPrototype, metadata: ControllerMetadata): ControllerRegister | undefined {
    const creator = this.registerCreatorMap.get(metadata.type);
    if (!creator) {
      return;
    }
    return creator(proto, metadata, this.host);
  }
}
