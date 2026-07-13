import type { ControllerMetadata, ControllerTypeLike } from '@eggjs/controller-decorator';
import { InnerObjectProto } from '@eggjs/core-decorator';
import type { EggPrototype } from '@eggjs/metadata';

import type { ControllerRegister } from './ControllerRegister.ts';

/**
 * `THost` is whatever the host wants to thread through to its register
 * creators (the egg plugin passes the Application; standalone runtimes
 * typically pass nothing).
 */
export type RegisterCreator<THost = unknown> = (
  proto: EggPrototype,
  controllerMeta: ControllerMetadata,
  host: THost,
) => ControllerRegister;

// A controller-module inner-object proto (see RootProtoManager for the
// host-agnostic-definition / per-host-re-export contract). PRIVATE: only the
// register providers and the load-unit hook inject it, all inner objects.
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
