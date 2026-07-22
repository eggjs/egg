import type { ControllerMetadata, ControllerTypeLike } from '@eggjs/controller-decorator';
import { MapUtil } from '@eggjs/tegg-common-util';
import { TeggScope } from '@eggjs/tegg-types';

const CONTROLLER_METADATA_MANAGER_SLOT = Symbol('tegg:controller:controllerMetadataManager');

export class ControllerMetadataManager {
  private readonly controllers = new Map<ControllerTypeLike, ControllerMetadata[]>();

  // Per-app: two apps loading the same controller class would collide on the
  // duplicate-name check, so each app gets its own manager via TeggScope.
  static get instance(): ControllerMetadataManager {
    return TeggScope.resolve(
      CONTROLLER_METADATA_MANAGER_SLOT,
      () => new ControllerMetadataManager(),
      'ControllerMetadataManager.instance',
    );
  }

  addController(metadata: ControllerMetadata): void {
    const typeControllers = MapUtil.getOrStore(this.controllers, metadata.type, []);
    // 1.check controller name
    // 2.check proto name
    const sameNameControllers = typeControllers.filter((c) => c.controllerName === metadata.controllerName);
    if (sameNameControllers.length) {
      throw new Error(`duplicate controller name ${metadata.controllerName}`);
    }
    const sameProtoControllers = typeControllers.filter((c) => c.protoName === metadata.protoName);
    if (sameProtoControllers.length) {
      throw new Error(`duplicate proto name ${String(metadata.protoName)}`);
    }
    typeControllers.push(metadata);
  }

  clear(): void {
    this.controllers.clear();
  }
}
