import { type ControllerMetadata, type ControllerTypeLike } from '@eggjs/tegg';
import { MapUtil } from '@eggjs/tegg-common-util';

export class ControllerMetadataManager {
  private readonly controllers = new Map<ControllerTypeLike, ControllerMetadata[]>();

  static instance = new ControllerMetadataManager();

  constructor() {
    this.controllers = new Map();
  }

  addController(metadata: ControllerMetadata) {
    const typeControllers = MapUtil.getOrStore(this.controllers, metadata.type, []);
    // 1.check controller name
    // 2.check proto name
    const sameNameControllers = typeControllers.filter(c => c.controllerName === metadata.controllerName);
    if (sameNameControllers.length) {
      throw new Error(`duplicate controller name ${metadata.controllerName}`);
    }
    const sameProtoControllers = typeControllers.filter(c => c.protoName === metadata.protoName);
    if (sameProtoControllers.length) {
      throw new Error(`duplicate proto name ${String(metadata.protoName)}`);
    }
    typeControllers.push(metadata);
  }

  clear() {
    this.controllers.clear();
  }
}
