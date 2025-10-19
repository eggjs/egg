import { MetadataUtil } from '@eggjs/core-decorator';
import { MapUtil } from '@eggjs/tegg-common-util';
import {
  type IAdvice,
  METHOD_ACL,
  METHOD_AOP_MIDDLEWARES,
  METHOD_AOP_REGISTER_MAP,
  METHOD_CONTEXT_INDEX,
  METHOD_CONTROLLER_HOST,
  METHOD_CONTROLLER_TYPE_MAP,
  METHOD_MIDDLEWARES,
} from '@eggjs/tegg-types';
import type { ControllerTypeLike, EggProtoImplClass, MiddlewareFunc } from '@eggjs/tegg-types';

type METHOD_MAP = Map<string, ControllerTypeLike | string[]>;
type MethodAopRegisterMap = Map<string, boolean>;
type MethodContextIndexMap = Map<string, number>;
type MethodMiddlewareMap = Map<string, MiddlewareFunc[]>;
type MethodAopMiddlewareMap = Map<string, EggProtoImplClass<IAdvice>[]>;
type MethodAclMap = Map<string, string | undefined>;

export class MethodInfoUtil {
  static setMethodControllerType(
    clazz: EggProtoImplClass,
    methodName: string,
    controllerType: ControllerTypeLike
  ): void {
    const methodControllerMap: METHOD_MAP = MetadataUtil.initOwnMapMetaData(
      METHOD_CONTROLLER_TYPE_MAP,
      clazz,
      new Map()
    );
    methodControllerMap.set(methodName, controllerType);
  }

  static getMethodControllerType(clazz: EggProtoImplClass, methodName: string): ControllerTypeLike | undefined {
    const methodControllerMap: METHOD_MAP | undefined = MetadataUtil.getMetaData(METHOD_CONTROLLER_TYPE_MAP, clazz);
    return methodControllerMap?.get(methodName) as ControllerTypeLike | undefined;
  }

  static setMethodContextIndexInArgs(index: number, clazz: EggProtoImplClass, methodName: string): void {
    const methodContextIndexMap: MethodContextIndexMap = MetadataUtil.initOwnMapMetaData(
      METHOD_CONTEXT_INDEX,
      clazz,
      new Map()
    );
    methodContextIndexMap.set(methodName, index);
  }

  static getMethodContextIndex(clazz: EggProtoImplClass, methodName: string): number | undefined {
    const methodContextIndexMap: MethodContextIndexMap | undefined = MetadataUtil.getMetaData(
      METHOD_CONTEXT_INDEX,
      clazz
    );
    return methodContextIndexMap?.get(methodName);
  }

  static addMethodMiddleware(middleware: MiddlewareFunc, clazz: EggProtoImplClass, methodName: string): void {
    const methodMiddlewareMap: MethodMiddlewareMap = MetadataUtil.initOwnMapMetaData(
      METHOD_MIDDLEWARES,
      clazz,
      new Map()
    );
    const methodMiddlewares = MapUtil.getOrStore(methodMiddlewareMap, methodName, []);
    methodMiddlewares.push(middleware);
  }

  static getMethodMiddlewares(clazz: EggProtoImplClass, methodName: string): MiddlewareFunc[] {
    const methodMiddlewareMap: MethodMiddlewareMap | undefined = MetadataUtil.getMetaData(METHOD_MIDDLEWARES, clazz);
    return methodMiddlewareMap?.get(methodName) || [];
  }

  static addMethodAopMiddleware(
    middleware: EggProtoImplClass<IAdvice>,
    clazz: EggProtoImplClass,
    methodName: string
  ): void {
    const methodMiddlewareMap: MethodAopMiddlewareMap = MetadataUtil.initOwnMapMetaData(
      METHOD_AOP_MIDDLEWARES,
      clazz,
      new Map()
    );
    const methodMiddlewares = MapUtil.getOrStore(methodMiddlewareMap, methodName, []);
    methodMiddlewares.push(middleware);
  }

  static getMethodAopMiddlewares(clazz: EggProtoImplClass, methodName: string): EggProtoImplClass<IAdvice>[] {
    const methodMiddlewareMap: MethodAopMiddlewareMap | undefined = MetadataUtil.getMetaData(
      METHOD_AOP_MIDDLEWARES,
      clazz
    );
    return methodMiddlewareMap?.get(methodName) || [];
  }

  static setMethodAcl(code: string | undefined, clazz: EggProtoImplClass, methodName: string): void {
    const methodAclMap: MethodAclMap = MetadataUtil.initOwnMapMetaData(METHOD_ACL, clazz, new Map());
    methodAclMap.set(methodName, code);
  }

  static hasMethodAcl(clazz: EggProtoImplClass, methodName: string): boolean {
    const methodAclMap: MethodAclMap | undefined = MetadataUtil.getMetaData(METHOD_ACL, clazz);
    return !!methodAclMap?.has(methodName);
  }

  static getMethodAcl(clazz: EggProtoImplClass, methodName: string): string | undefined {
    const methodAclMap: MethodAclMap | undefined = MetadataUtil.getMetaData(METHOD_ACL, clazz);
    return methodAclMap?.get(methodName);
  }

  static setMethodHosts(hosts: string[], clazz: EggProtoImplClass, methodName: string): void {
    const methodControllerMap: METHOD_MAP = MetadataUtil.initOwnMapMetaData(METHOD_CONTROLLER_HOST, clazz, new Map());
    methodControllerMap.set(methodName, hosts);
  }

  static getMethodHosts(clazz: EggProtoImplClass, methodName: string): string[] | undefined {
    const methodControllerMap: METHOD_MAP | undefined = MetadataUtil.getMetaData(METHOD_CONTROLLER_HOST, clazz);
    return methodControllerMap?.get(methodName) as string[] | undefined;
  }

  static getMethods(clazz: EggProtoImplClass): string[] {
    const methodControllerMap: METHOD_MAP | undefined = MetadataUtil.getMetaData(METHOD_CONTROLLER_TYPE_MAP, clazz);
    return Array.from(methodControllerMap?.keys() || []);
  }

  static shouldRegisterAopMiddlewarePointCut(clazz: EggProtoImplClass, methodName: string): boolean {
    const methodControllerMap: MethodAopRegisterMap | undefined = MetadataUtil.getMetaData(
      METHOD_AOP_REGISTER_MAP,
      clazz
    );
    return !(methodControllerMap && methodControllerMap.get(methodName));
  }

  static registerAopMiddlewarePointcut(clazz: EggProtoImplClass, methodName: string): void {
    const methodControllerMap: MethodAopRegisterMap = MetadataUtil.initOwnMapMetaData(
      METHOD_AOP_REGISTER_MAP,
      clazz,
      new Map()
    );
    methodControllerMap.set(methodName, true);
  }
}
