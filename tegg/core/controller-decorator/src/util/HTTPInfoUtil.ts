import { MetadataUtil } from '@eggjs/core-decorator';
import {
  CONTROLLER_HTTP_PATH,
  CONTROLLER_METHOD_METHOD_MAP,
  CONTROLLER_METHOD_PARAM_NAME_MAP,
  CONTROLLER_METHOD_PARAM_TYPE_MAP,
  CONTROLLER_METHOD_PATH_MAP,
  CONTROLLER_METHOD_PRIORITY,
} from '@eggjs/tegg-types';
import type { EggProtoImplClass, HTTPMethodEnum, HTTPParamType } from '@eggjs/tegg-types';
import { MapUtil } from '@eggjs/tegg-common-util';

type HTTPMethodPathMap = Map<string, string>;
type HTTPMethodMethodMap = Map<string, HTTPMethodEnum>;
type HTTPMethodParamTypeMap = Map<string, Map<number, HTTPParamType>>;
type HTTPMethodParamNameMap = Map<string, Map<number, string>>;
type HTTPMethodPriorityMap = Map<string, number>;

export class HTTPInfoUtil {
  static setHTTPPath(path: string, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(CONTROLLER_HTTP_PATH, path, clazz);
  }

  static getHTTPPath(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getMetaData(CONTROLLER_HTTP_PATH, clazz);
  }

  static setHTTPMethodPath(path: string, clazz: EggProtoImplClass, methodName: string) {
    const methodPathMap = MetadataUtil.initOwnMapMetaData(CONTROLLER_METHOD_PATH_MAP, clazz, new Map());
    methodPathMap.set(methodName, path);
  }

  static getHTTPMethodPath(clazz: EggProtoImplClass, methodName: string): string | undefined {
    const methodPathMap: HTTPMethodPathMap | undefined = MetadataUtil.getMetaData(CONTROLLER_METHOD_PATH_MAP, clazz);
    return methodPathMap?.get(methodName);
  }

  static setHTTPMethodMethod(method: HTTPMethodEnum, clazz: EggProtoImplClass, methodName: string) {
    const methodMap: HTTPMethodMethodMap = MetadataUtil.initOwnMapMetaData(
      CONTROLLER_METHOD_METHOD_MAP,
      clazz,
      new Map()
    );
    methodMap.set(methodName, method);
  }

  static getHTTPMethodMethod(clazz: EggProtoImplClass, methodName: string): HTTPMethodEnum | undefined {
    const methodMap: HTTPMethodMethodMap | undefined = MetadataUtil.getMetaData(CONTROLLER_METHOD_METHOD_MAP, clazz);
    return methodMap?.get(methodName);
  }

  static setHTTPMethodParamType(
    paramType: HTTPParamType,
    parameterIndex: number,
    clazz: EggProtoImplClass,
    methodName: string
  ) {
    const methodParamMap: HTTPMethodParamTypeMap = MetadataUtil.initOwnMapMetaData(
      CONTROLLER_METHOD_PARAM_TYPE_MAP,
      clazz,
      new Map()
    );
    const paramMap = MapUtil.getOrStore(methodParamMap, methodName, new Map());
    paramMap.set(parameterIndex, paramType);
  }

  static getParamIndexList(clazz: EggProtoImplClass, methodName: string): number[] {
    const methodParamMap: HTTPMethodParamTypeMap | undefined = MetadataUtil.getMetaData(
      CONTROLLER_METHOD_PARAM_TYPE_MAP,
      clazz
    );
    const paramMap = methodParamMap?.get(methodName);
    if (!paramMap) {
      return [];
    }
    return Array.from(paramMap.keys());
  }

  static getHTTPMethodParamType(
    parameterIndex: number,
    clazz: EggProtoImplClass,
    methodName: string
  ): HTTPParamType | undefined {
    const methodParamMap: HTTPMethodParamTypeMap | undefined = MetadataUtil.getMetaData(
      CONTROLLER_METHOD_PARAM_TYPE_MAP,
      clazz
    );
    const paramMap = methodParamMap?.get(methodName);
    return paramMap?.get(parameterIndex);
  }

  static setHTTPMethodParamName(
    paramName: string,
    parameterIndex: number,
    clazz: EggProtoImplClass,
    methodName: string
  ) {
    const methodParamNameMap: HTTPMethodParamNameMap = MetadataUtil.initOwnMapMetaData(
      CONTROLLER_METHOD_PARAM_NAME_MAP,
      clazz,
      new Map()
    );
    const paramMap = MapUtil.getOrStore(methodParamNameMap, methodName, new Map());
    paramMap.set(parameterIndex, paramName);
  }

  static getHTTPMethodParamName(
    parameterIndex: number,
    clazz: EggProtoImplClass,
    methodName: string
  ): string | undefined {
    const methodParamNameMap: HTTPMethodParamNameMap | undefined = MetadataUtil.getMetaData(
      CONTROLLER_METHOD_PARAM_NAME_MAP,
      clazz
    );
    const paramMap = methodParamNameMap?.get(methodName);
    return paramMap?.get(parameterIndex);
  }

  static getHTTPMethodPriority(clazz: EggProtoImplClass, methodName: string): number | undefined {
    const methodPriorityMap: HTTPMethodPriorityMap | undefined = MetadataUtil.getMetaData(
      CONTROLLER_METHOD_PRIORITY,
      clazz
    );
    return methodPriorityMap?.get(methodName);
  }

  static setHTTPMethodPriority(priority: number, clazz: EggProtoImplClass, methodName: string) {
    const methodPriorityMap: HTTPMethodPriorityMap = MetadataUtil.initOwnMapMetaData(
      CONTROLLER_METHOD_PRIORITY,
      clazz,
      new Map()
    );
    methodPriorityMap.set(methodName, priority);
  }
}
