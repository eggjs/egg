import { CONTROLLER_META_DATA, type ControllerMetadata } from '@eggjs/controller-decorator';
import { Inject, LoadUnitLifecycleProto } from '@eggjs/core-decorator';
import type { LifecycleHook } from '@eggjs/lifecycle';
import type { LoadUnit, LoadUnitLifecycleContext } from '@eggjs/metadata';

import { ControllerMetadataManager } from './ControllerMetadataManager.ts';
import { ControllerRegisterFactory } from './ControllerRegisterFactory.ts';
import { RootProtoManager } from './RootProtoManager.ts';

/**
 * Host-agnostic load-unit lifecycle proto: for every controller proto in a
 * created load unit, resolve the register for its controller type and run it.
 * Defined once here; each host re-exports it into its own scanned eggModule.
 */
@LoadUnitLifecycleProto()
export class ControllerLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly controllerRegisterFactory: ControllerRegisterFactory<any>;
  private readonly rootProtoManager: RootProtoManager;

  constructor(
    @Inject() controllerRegisterFactory: ControllerRegisterFactory<any>,
    @Inject() rootProtoManager: RootProtoManager,
  ) {
    this.controllerRegisterFactory = controllerRegisterFactory;
    this.rootProtoManager = rootProtoManager;
  }

  async postCreate(_: LoadUnitLifecycleContext, obj: LoadUnit): Promise<void> {
    const iterator = obj.iterateEggPrototype();
    for (const proto of iterator) {
      const metadata: ControllerMetadata | undefined = proto.getMetaData(CONTROLLER_META_DATA);
      if (!metadata) {
        continue;
      }
      const register = this.controllerRegisterFactory.getControllerRegister(proto, metadata);
      if (!register) {
        throw new Error(`not find controller implement for ${String(proto.name)} which type is ${metadata.type}`);
      }
      ControllerMetadataManager.instance.addController(metadata);
      await register.register(this.rootProtoManager, obj);
    }
  }
}
