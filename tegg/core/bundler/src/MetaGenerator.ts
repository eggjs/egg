import type { HTTPControllerMeta } from '@eggjs/controller-decorator';
import type { HTTPMethodMeta } from '@eggjs/controller-decorator';
import { ClassProtoDescriptor } from '@eggjs/metadata';
import type { ProtoDescriptor } from '@eggjs/tegg-types';

export interface ParamMetaInfo {
  type: string;
  name?: string;
  paramIndex: number;
}

export interface DependencyMetaInfo {
  refName: string;
  protoName: string;
  className: string;
  moduleName: string;
}

export interface MethodHttpMeta {
  method: string;
  path: string;
  fullPath: string;
  params: ParamMetaInfo[];
}

export interface MethodMeta {
  controllerName: string;
  className: string;
  protoName: string;
  methodName: string;
  http: MethodHttpMeta;
  dependencies: DependencyMetaInfo[];
}

/**
 * Generates a JSON meta descriptor for a controller method bundle.
 *
 * The meta file records:
 * - HTTP routing info (method, path, params)
 * - DI dependency info (which protos the method depends on)
 */
export class MetaGenerator {
  /**
   * Generate meta for one controller method.
   *
   * @param controllerMeta - The HTTP controller metadata
   * @param methodMeta - The HTTP method metadata
   * @param deps - Resolved dependency proto descriptors
   * @param controllerProto - The controller's proto descriptor
   * @param accessedProps - Set of property names accessed in the method body
   * @returns Serializable method meta object
   */
  generate(
    controllerMeta: HTTPControllerMeta,
    methodMeta: HTTPMethodMeta,
    deps: ProtoDescriptor[],
    controllerProto: ProtoDescriptor,
    accessedProps: Set<string>,
  ): MethodMeta {
    // Build params list from the method's paramMap
    const params: ParamMetaInfo[] = [];
    for (const [paramIndex, paramInfo] of methodMeta.paramMap.entries()) {
      const param: ParamMetaInfo = {
        type: paramInfo.type,
        paramIndex,
      };
      // QueryParamMeta, QueriesParamMeta, PathParamMeta have a `name` property
      if ('name' in paramInfo && typeof paramInfo.name === 'string') {
        param.name = paramInfo.name;
      }
      params.push(param);
    }
    // Sort by paramIndex for deterministic output
    params.sort((a, b) => a.paramIndex - b.paramIndex);

    // Build dependencies list - direct deps first (with refName from inject objects),
    // then transitive deps that aren't already listed
    const dependencies: DependencyMetaInfo[] = [];

    for (const injectObj of controllerProto.injectObjects) {
      if (!accessedProps.has(injectObj.refName as string)) continue;

      // Find the corresponding dep proto by matching the objName
      const matchedDep = deps.find((d) => String(d.name) === String(injectObj.objName));
      if (!matchedDep) continue;

      const className = ClassProtoDescriptor.isClassProtoDescriptor(matchedDep)
        ? matchedDep.clazz.name
        : (matchedDep.className ?? String(matchedDep.name));

      dependencies.push({
        refName: String(injectObj.refName),
        protoName: String(matchedDep.name),
        className,
        moduleName: matchedDep.instanceModuleName,
      });
    }

    // Also include transitive deps that are not direct controller inject objects
    for (const dep of deps) {
      const alreadyListed = dependencies.some(
        (d) => d.protoName === String(dep.name) && d.moduleName === dep.instanceModuleName,
      );
      if (alreadyListed) continue;

      const className = ClassProtoDescriptor.isClassProtoDescriptor(dep)
        ? dep.clazz.name
        : (dep.className ?? String(dep.name));

      dependencies.push({
        refName: String(dep.name),
        protoName: String(dep.name),
        className,
        moduleName: dep.instanceModuleName,
      });
    }

    return {
      controllerName: controllerMeta.controllerName,
      className: controllerMeta.className,
      protoName: String(controllerProto.name),
      methodName: methodMeta.name,
      http: {
        method: String(methodMeta.method),
        path: methodMeta.path,
        fullPath: controllerMeta.getMethodRealPath(methodMeta),
        params,
      },
      dependencies,
    };
  }
}
