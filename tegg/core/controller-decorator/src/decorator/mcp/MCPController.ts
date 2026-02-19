import { PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import { ControllerType, AccessLevel } from '@eggjs/tegg-types';
import type { MCPControllerParams, EggProtoImplClass } from '@eggjs/tegg-types';

import { ControllerInfoUtil } from '../../util/ControllerInfoUtil.ts';
import { MCPInfoUtil } from '../../util/MCPInfoUtil.ts';

export function MCPController(param?: MCPControllerParams) {
  return function (constructor: EggProtoImplClass) {
    const func = SingletonProto({
      accessLevel: AccessLevel.PUBLIC,
      name: param?.protoName,
    });
    func(constructor);
    ControllerInfoUtil.setControllerType(constructor, ControllerType.MCP);
    if (param?.controllerName) {
      ControllerInfoUtil.setControllerName(constructor, param?.controllerName);
    }
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));

    if (param?.name) {
      MCPInfoUtil.setMCPName(param.name, constructor);
    }
    if (param?.version) {
      MCPInfoUtil.setMCPVersion(param.version, constructor);
    }
    MCPInfoUtil.setMCPControllerParams(param, constructor);
  };
}
