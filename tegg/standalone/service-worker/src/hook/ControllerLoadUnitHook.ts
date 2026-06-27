import { LifecycleHook } from '@eggjs/tegg-lifecycle';
import { EggPrototype, LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg/helper';
import { CONTROLLER_META_DATA, ControllerMetadata, ControllerType } from '@eggjs/tegg';
import { ControllerRegisterFactory } from '../controller/ControllerRegisterFactory.ts';
import { RootProtoManager } from '../controller/RootProtoManager.ts';
import { ControllerMetadataManager } from '../controller/ControllerMetadataManager.ts';
import { FetchRouter } from '../http/FetchRouter.ts';
import { HTTPControllerRegister } from '../http/HTTPControllerRegister.ts';
import { MCPControllerRegister } from '../mcp/MCPControllerRegister.ts';

export class ControllerLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly controllerRegisterFactory: ControllerRegisterFactory;
  private readonly rootProtoManager: RootProtoManager;
  private readonly controllerMetadataManager: ControllerMetadataManager;
  private readonly fetchRouter: FetchRouter;

  constructor(
    controllerRegisterFactory: ControllerRegisterFactory,
    rootProtoManager: RootProtoManager,
    controllerMetadataManager: ControllerMetadataManager,
    fetchRouter: FetchRouter,
  ) {
    this.controllerRegisterFactory = controllerRegisterFactory;
    this.rootProtoManager = rootProtoManager;
    this.controllerMetadataManager = controllerMetadataManager;
    this.fetchRouter = fetchRouter;

    // Register the HTTP controller register creator
    this.controllerRegisterFactory.registerControllerRegister(ControllerType.HTTP, (proto: EggPrototype, controllerMeta: ControllerMetadata) => {
      return HTTPControllerRegister.create(proto, controllerMeta, this.fetchRouter);
    });

    // Register the MCP controller register creator
    this.controllerRegisterFactory.registerControllerRegister(ControllerType.MCP, (proto: EggPrototype, controllerMeta: ControllerMetadata) => {
      return MCPControllerRegister.create(proto, controllerMeta, this.fetchRouter);
    });
  }

  async postCreate(_: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    const iterator = loadUnit.iterateEggPrototype();
    for (const proto of iterator) {
      const metadata: ControllerMetadata | undefined = proto.getMetaData(CONTROLLER_META_DATA);
      if (!metadata) {
        continue;
      }
      const register = this.controllerRegisterFactory.getControllerRegister(proto, metadata);
      if (!register) {
        throw new Error(`not find controller implement for ${String(proto.name)} which type is ${metadata.type}`);
      }
      this.controllerMetadataManager.addController(metadata);
      await register.register(this.rootProtoManager);
    }
  }
}
