import { LifecyclePostInject } from '@eggjs/lifecycle';
import { EggPrototypeLifecycleProto, Inject, InnerObjectProto, LoadUnitLifecycleProto } from '@eggjs/tegg';
import { AccessLevel } from '@eggjs/tegg-types';

import { ControllerLoadUnitHook } from './ControllerLoadUnitHook.ts';
import { ControllerPrototypeHook } from './ControllerPrototypeHook.ts';
import { ControllerRegisterDefaults } from './ControllerRegisterDefaults.ts';
import { ControllerRegisterFactory } from './ControllerRegisterFactory.ts';
import { RootProtoManager } from './RootProtoManager.ts';

/**
 * The controller plugin AS a module: the same declarative hook set for BOTH
 * hosts (egg discovers it through the framework scan + plugin promotion, the
 * service worker through its package dependency). Only host-EQUIVALENT
 * pieces live here — egg-only transport wiring stays imperative in app.ts
 * (creators enqueue through ControllerRegisterDefaults), fetch transport
 * providers live in @eggjs/service-worker. The `egg` import is type-only so
 * the scan stays host-safe.
 */
@InnerObjectProto({ name: 'rootProtoManager', accessLevel: AccessLevel.PUBLIC })
export class EggRootProtoManager extends RootProtoManager {}

@InnerObjectProto({ name: 'controllerRegisterFactory', accessLevel: AccessLevel.PUBLIC })
export class EggControllerRegisterFactory extends ControllerRegisterFactory {
  // No host is threaded through the DI graph: egg's transport creators close
  // over `app` imperatively (see app.ts), the fetch creators are container
  // citizens. Both register through ControllerRegisterDefaults / the injected
  // factory directly.

  /**
   * Apply the transport creators the host enqueued imperatively before this
   * proto existed (egg's HTTP/MCP registers close over boot-time state).
   */
  @LifecyclePostInject()
  applyDefaultRegisters(): void {
    ControllerRegisterDefaults.drain(this);
  }
}

@LoadUnitLifecycleProto()
export class EggControllerLoadUnitHook extends ControllerLoadUnitHook {
  constructor(
    @Inject() controllerRegisterFactory: EggControllerRegisterFactory,
    @Inject() rootProtoManager: EggRootProtoManager,
  ) {
    super(controllerRegisterFactory, rootProtoManager);
  }
}

@EggPrototypeLifecycleProto()
export class EggControllerPrototypeLifecycleHook extends ControllerPrototypeHook {}
