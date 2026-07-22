import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { MCPToolMeta } from '../../model/index.ts';
import { MCPInfoUtil } from '../../util/MCPInfoUtil.ts';
import { MethodInfoUtil } from '../../util/MethodInfoUtil.ts';
import { MethodValidator } from '../../util/validator/MethodValidator.ts';

export class MCPControllerToolMetaBuilder {
  private readonly clazz: EggProtoImplClass;
  private readonly methodName: string;

  constructor(clazz: EggProtoImplClass, methodName: string) {
    this.clazz = clazz;
    this.methodName = methodName;
  }

  build(): MCPToolMeta | undefined {
    MethodValidator.validate(this.clazz, this.methodName);
    const controllerType = MethodInfoUtil.getMethodControllerType(this.clazz, this.methodName);
    if (!controllerType) {
      return undefined;
    }
    const middlewares = MethodInfoUtil.getMethodMiddlewares(this.clazz, this.methodName);
    const advices = MethodInfoUtil.getMethodAopMiddlewares(this.clazz, this.methodName);
    const needAcl = MethodInfoUtil.hasMethodAcl(this.clazz, this.methodName);
    const aclCode = MethodInfoUtil.getMethodAcl(this.clazz, this.methodName);
    const params = MCPInfoUtil.getMCPToolParams(this.clazz, this.methodName);
    const detail = MCPInfoUtil.getMCPToolArgsIndex(this.clazz, this.methodName);
    const extra = MCPInfoUtil.getMCPExtra(this.clazz, this.methodName);

    return new MCPToolMeta({
      name: this.methodName,
      middlewares,
      advices,
      needAcl,
      aclCode,
      detail,
      extra,
      ...params,
    });
  }
}
