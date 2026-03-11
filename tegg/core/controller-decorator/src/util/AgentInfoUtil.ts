import { MetadataUtil } from '@eggjs/core-decorator';
import {
  CONTROLLER_AGENT_CONTROLLER,
  CONTROLLER_AGENT_NOT_IMPLEMENTED,
  CONTROLLER_AGENT_ENHANCED,
} from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

export class AgentInfoUtil {
  static setAgentController(clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(CONTROLLER_AGENT_CONTROLLER, true, clazz);
  }

  static isAgentController(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(CONTROLLER_AGENT_CONTROLLER, clazz);
  }

  static setNotImplemented(fn: Function): void {
    Reflect.defineMetadata(CONTROLLER_AGENT_NOT_IMPLEMENTED, true, fn);
  }

  static isNotImplemented(fn: Function): boolean {
    return !!Reflect.getMetadata(CONTROLLER_AGENT_NOT_IMPLEMENTED, fn);
  }

  static setEnhanced(clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(CONTROLLER_AGENT_ENHANCED, true, clazz);
  }

  static isEnhanced(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(CONTROLLER_AGENT_ENHANCED, clazz);
  }
}
