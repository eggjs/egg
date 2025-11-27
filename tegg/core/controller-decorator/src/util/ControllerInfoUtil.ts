import { MetadataUtil } from '@eggjs/core-decorator';
import type { ControllerTypeLike, EggProtoImplClass, MiddlewareFunc } from '@eggjs/tegg-types';
import {
  CONTROLLER_ACL,
  CONTROLLER_AOP_MIDDLEWARES,
  CONTROLLER_HOST,
  CONTROLLER_MIDDLEWARES,
  CONTROLLER_NAME,
  CONTROLLER_TYPE,
  type IAdvice,
} from '@eggjs/tegg-types';

export class ControllerInfoUtil {
  static addControllerMiddleware(middleware: MiddlewareFunc, clazz: EggProtoImplClass): void {
    const middlewares = MetadataUtil.initOwnArrayMetaData<MiddlewareFunc>(CONTROLLER_MIDDLEWARES, clazz, []);
    middlewares.push(middleware);
  }

  static addControllerAopMiddleware(middleware: EggProtoImplClass<IAdvice>, clazz: EggProtoImplClass): void {
    const middlewares = MetadataUtil.initOwnArrayMetaData<EggProtoImplClass<IAdvice>>(
      CONTROLLER_AOP_MIDDLEWARES,
      clazz,
      [],
    );
    middlewares.push(middleware);
  }

  static getControllerMiddlewares(clazz: EggProtoImplClass): MiddlewareFunc[] {
    return MetadataUtil.getMetaData(CONTROLLER_MIDDLEWARES, clazz) || [];
  }

  static getControllerAopMiddlewares(clazz: EggProtoImplClass): EggProtoImplClass<IAdvice>[] {
    return MetadataUtil.getMetaData(CONTROLLER_AOP_MIDDLEWARES, clazz) || [];
  }

  static setControllerType(clazz: EggProtoImplClass, controllerType: ControllerTypeLike): void {
    MetadataUtil.defineMetaData(CONTROLLER_TYPE, controllerType, clazz);
  }

  static setControllerName(clazz: EggProtoImplClass, controllerName: string): void {
    MetadataUtil.defineMetaData(CONTROLLER_NAME, controllerName, clazz);
  }

  static getControllerName(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_NAME, clazz);
  }

  static getControllerType(clazz: EggProtoImplClass): ControllerTypeLike | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_TYPE, clazz);
  }

  static setControllerAcl(code: string | undefined, clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(CONTROLLER_ACL, code, clazz);
  }

  static hasControllerAcl(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.hasMetaData(CONTROLLER_ACL, clazz);
  }

  static getControllerAcl(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_ACL, clazz);
  }

  static addControllerHosts(hosts: string[], clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(CONTROLLER_HOST, hosts, clazz);
  }

  static getControllerHosts(clazz: EggProtoImplClass): string[] | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_HOST, clazz);
  }
}
