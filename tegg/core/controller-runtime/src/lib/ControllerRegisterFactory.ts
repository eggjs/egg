import type { ControllerMetadata, ControllerTypeLike } from '@eggjs/controller-decorator';
import { InnerObjectProto } from '@eggjs/core-decorator';
import { LifecyclePostInject } from '@eggjs/lifecycle';
import type { EggPrototype } from '@eggjs/metadata';
import { AccessLevel } from '@eggjs/tegg-types';

import type { ControllerRegister } from './ControllerRegister.ts';
import { ControllerRegisterDefaults } from './ControllerRegisterDefaults.ts';

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

/**
 * A controller-module inner-object proto (see {@link RootProtoManager} for the
 * host-agnostic-definition / per-host-re-export contract).
 */
@InnerObjectProto({ name: 'controllerRegisterFactory', accessLevel: AccessLevel.PUBLIC })
export class ControllerRegisterFactory<THost = unknown> {
  private readonly host: THost;
  private registerCreatorMap: Map<ControllerTypeLike, RegisterCreator<THost>>;

  constructor(host?: THost) {
    this.host = host as THost;
    this.registerCreatorMap = new Map();
  }

  /**
   * Apply the transport creators a host enqueued imperatively before this proto
   * existed (the egg host's MCP creator closes over boot-time `app` state and
   * cannot be a container citizen). Hosts whose creators are container citizens
   * (the fetch providers) never enqueue, so this drain is a no-op for them.
   */
  @LifecyclePostInject()
  applyDefaultRegisters(): void {
    ControllerRegisterDefaults.drain(this);
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
