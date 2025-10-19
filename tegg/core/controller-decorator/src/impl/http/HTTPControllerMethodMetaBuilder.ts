import path from 'node:path';

import { ClassUtil } from '@eggjs/tegg-metadata';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { HTTPMethodMeta, ParamMeta, ParamMetaUtil } from '../../model/index.ts';
import { MethodValidator, HTTPInfoUtil, MethodInfoUtil, HTTPPriorityUtil } from '../../util/index.ts';

export class HTTPControllerMethodMetaBuilder {
  private readonly clazz: EggProtoImplClass;
  private readonly methodName: string;

  constructor(clazz: EggProtoImplClass, methodName: string) {
    this.clazz = clazz;
    this.methodName = methodName;
  }

  // 检查 HTTP 方法上参数是否都加上了注解
  // foo(a, b=233, c); foo.length = 2;
  // 由于这种情况的存在, 所以需要对 function 参数检查进行特殊处理
  // 如果有注解的参数比 function.length 长, 长度应该取有注解参数总数（包括 @Context）
  //
  // 但是有两种特殊情况无法处理
  // foo(@Context() ctx, @HTTPParam() id1, id2 = 233)
  // foo(@Context() ctx, @HTTPParam() id1, id2 = 233, id3)
  // 这两种情况均为默认值参数在
  private checkParamDecorators() {
    const method = this.clazz.prototype[this.methodName];

    // 获取函数参数长度
    const functionLength = method.length;

    // 计算带注解参数
    const paramIndexList = HTTPInfoUtil.getParamIndexList(this.clazz, this.methodName);
    const contextIndex = MethodInfoUtil.getMethodContextIndex(this.clazz, this.methodName);
    const hasAnnotationParamCount =
      typeof contextIndex === 'undefined' ? paramIndexList.length : paramIndexList.length + 1;

    const maxParamCount = Math.max(functionLength, hasAnnotationParamCount);

    for (let i = 0; i < maxParamCount; ++i) {
      // 上下文参数, 跳过检查
      if (i === contextIndex) {
        continue;
      }
      const paramType = HTTPInfoUtil.getHTTPMethodParamType(i, this.clazz, this.methodName);
      if (!paramType) {
        const classDesc = ClassUtil.classDescription(this.clazz);
        throw new Error(
          `${classDesc}:${this.methodName} param ${i} has no http param type, Please add @HTTPBody, @HTTPParam, @HTTPQuery, @HTTPQueries`
        );
      }
    }
  }

  private buildParamType(httpPath: string): Map<number, ParamMeta> {
    this.checkParamDecorators();

    const paramTypeMap = new Map<number, ParamMeta>();
    const paramIndexList = HTTPInfoUtil.getParamIndexList(this.clazz, this.methodName);
    for (const paramIndex of paramIndexList) {
      const paramType = HTTPInfoUtil.getHTTPMethodParamType(paramIndex, this.clazz, this.methodName)!;
      const paramName = HTTPInfoUtil.getHTTPMethodParamName(paramIndex, this.clazz, this.methodName);
      const paramMeta = ParamMetaUtil.createParam(paramType, paramName);

      try {
        paramMeta.validate(httpPath);
      } catch (e: any) {
        const classDesc = ClassUtil.classDescription(this.clazz);
        e.message = `build controller ${classDesc} method ${this.methodName} param ${paramName} failed: ${e.message}`;
        throw e;
      }

      paramTypeMap.set(paramIndex, paramMeta);
    }
    return paramTypeMap;
  }

  getPriority(): number {
    const priority = HTTPInfoUtil.getHTTPMethodPriority(this.clazz, this.methodName);
    if (priority !== undefined) {
      return priority;
    }
    const controllerPath = HTTPInfoUtil.getHTTPPath(this.clazz);
    const methodPath = HTTPInfoUtil.getHTTPMethodPath(this.clazz, this.methodName)!;
    const realPath = controllerPath ? path.posix.join(controllerPath, methodPath) : methodPath;
    const defaultPriority = HTTPPriorityUtil.calcPathPriority(realPath);
    if (defaultPriority > HTTPPriorityUtil.DEFAULT_PRIORITY) {
      throw new Error(`path ${realPath} is too long, should set priority manually`);
    }
    return defaultPriority;
  }

  build(): HTTPMethodMeta | undefined {
    MethodValidator.validate(this.clazz, this.methodName);
    const controllerType = MethodInfoUtil.getMethodControllerType(this.clazz, this.methodName);
    if (!controllerType) {
      return undefined;
    }
    const httpMethod = HTTPInfoUtil.getHTTPMethodMethod(this.clazz, this.methodName);
    const parentPath = HTTPInfoUtil.getHTTPPath(this.clazz);
    const httpPath = HTTPInfoUtil.getHTTPMethodPath(this.clazz, this.methodName)!;
    const contextIndex = MethodInfoUtil.getMethodContextIndex(this.clazz, this.methodName);
    const middlewares = MethodInfoUtil.getMethodMiddlewares(this.clazz, this.methodName);
    const needAcl = MethodInfoUtil.hasMethodAcl(this.clazz, this.methodName);
    const aclCode = MethodInfoUtil.getMethodAcl(this.clazz, this.methodName);
    const hosts = MethodInfoUtil.getMethodHosts(this.clazz, this.methodName);
    const realPath = parentPath ? path.posix.join(parentPath, httpPath) : httpPath;
    const paramTypeMap = this.buildParamType(realPath);
    const priority = this.getPriority();
    return new HTTPMethodMeta(
      this.methodName,
      httpPath!,
      httpMethod!,
      middlewares,
      contextIndex,
      paramTypeMap,
      priority,
      needAcl,
      aclCode,
      hosts
    );
  }
}
