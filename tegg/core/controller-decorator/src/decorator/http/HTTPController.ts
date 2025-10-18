import { PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import type { EggProtoImplClass, HTTPControllerParams } from '@eggjs/tegg-types';
import { AccessLevel, ControllerType } from '@eggjs/tegg-types';

import { ControllerInfoUtil, HTTPInfoUtil } from '../../util/index.ts';

export function HTTPController(param?: HTTPControllerParams) {
  return function (constructor: EggProtoImplClass) {
    ControllerInfoUtil.setControllerType(constructor, ControllerType.HTTP);
    if (param?.controllerName) {
      ControllerInfoUtil.setControllerName(constructor, param.controllerName);
    }
    if (param?.path) {
      HTTPInfoUtil.setHTTPPath(param.path, constructor);
    }
    // TODO elegant?
    const func = SingletonProto({
      accessLevel: AccessLevel.PUBLIC,
      name: param?.protoName,
    });
    func(constructor);

    // './tegg/core/common-util/src/StackUtil.ts',
    // './tegg/core/core-decorator/src/decorator/Prototype.ts',
    // './tegg/core/controller-decorator/src/decorator/http/HTTPController.ts',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/controller-decorator/test/fixtures/TRFooController.ts',
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));
  };
}
