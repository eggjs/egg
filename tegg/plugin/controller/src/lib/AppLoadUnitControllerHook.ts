import { type LoadUnit, type LoadUnitLifecycleContext } from '@eggjs/tegg-metadata';
import { CONTROLLER_META_DATA, type ControllerMetadata, type LifecycleHook } from '@eggjs/tegg';

import { ControllerRegisterFactory } from './ControllerRegisterFactory.ts';
import { ControllerMetadataManager } from './ControllerMetadataManager.ts';
import { RootProtoManager } from './RootProtoManager.ts';

export class AppLoadUnitControllerHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly controllerRegisterFactory: ControllerRegisterFactory;
  private readonly rootProtoManager: RootProtoManager;

  constructor(controllerRegisterFactory: ControllerRegisterFactory, rootProtoManager: RootProtoManager) {
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
