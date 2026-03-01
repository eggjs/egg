import { PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import {
  AccessLevel,
  AGENT_CONTROLLER_PROTO_IMPL_TYPE,
  ControllerType,
  HTTPMethodEnum,
  HTTPParamType,
} from '@eggjs/tegg-types';

import { AgentInfoUtil } from '../../util/AgentInfoUtil.ts';
import { ControllerInfoUtil } from '../../util/ControllerInfoUtil.ts';
import { HTTPInfoUtil } from '../../util/HTTPInfoUtil.ts';
import { MethodInfoUtil } from '../../util/MethodInfoUtil.ts';

interface AgentRouteDefinition {
  methodName: string;
  httpMethod: HTTPMethodEnum;
  path: string;
  paramType?: 'body' | 'pathParam';
  paramName?: string;
  hasParam: boolean;
}

// Default implementations for unimplemented methods.
// Methods with hasParam=true need function.length === 1 for param validation.
// Stubs are marked with Symbol.for('AGENT_NOT_IMPLEMENTED') so agent-runtime
// can distinguish them from user-defined methods at enhancement time.
function createNotImplemented(methodName: string, hasParam: boolean) {
  let fn;
  if (hasParam) {
    fn = async function (_arg: unknown) {
      throw new Error(`${methodName} not implemented`);
    };
  } else {
    fn = async function () {
      throw new Error(`${methodName} not implemented`);
    };
  }
  AgentInfoUtil.setNotImplemented(fn);
  return fn;
}

const AGENT_ROUTES: AgentRouteDefinition[] = [
  {
    methodName: 'createThread',
    httpMethod: HTTPMethodEnum.POST,
    path: '/threads',
    hasParam: false,
  },
  {
    methodName: 'getThread',
    httpMethod: HTTPMethodEnum.GET,
    path: '/threads/:id',
    paramType: 'pathParam',
    paramName: 'id',
    hasParam: true,
  },
  {
    methodName: 'asyncRun',
    httpMethod: HTTPMethodEnum.POST,
    path: '/runs',
    paramType: 'body',
    hasParam: true,
  },
  {
    methodName: 'streamRun',
    httpMethod: HTTPMethodEnum.POST,
    path: '/runs/stream',
    paramType: 'body',
    hasParam: true,
  },
  {
    methodName: 'syncRun',
    httpMethod: HTTPMethodEnum.POST,
    path: '/runs/wait',
    paramType: 'body',
    hasParam: true,
  },
  {
    methodName: 'getRun',
    httpMethod: HTTPMethodEnum.GET,
    path: '/runs/:id',
    paramType: 'pathParam',
    paramName: 'id',
    hasParam: true,
  },
  {
    methodName: 'cancelRun',
    httpMethod: HTTPMethodEnum.POST,
    path: '/runs/:id/cancel',
    paramType: 'pathParam',
    paramName: 'id',
    hasParam: true,
  },
];

export function AgentController() {
  return function (constructor: EggProtoImplClass) {
    // Set controller type as HTTP so existing infrastructure handles it
    ControllerInfoUtil.setControllerType(constructor, ControllerType.HTTP);

    // Set the fixed base HTTP path
    HTTPInfoUtil.setHTTPPath('/api/v1', constructor);

    // Apply SingletonProto with custom proto impl type
    const func = SingletonProto({
      accessLevel: AccessLevel.PUBLIC,
      protoImplType: AGENT_CONTROLLER_PROTO_IMPL_TYPE,
    });
    func(constructor);

    // Set file path for prototype
    // Stack depth 5: [0] getCalleeFromStack → [1] decorator fn → [2-4] reflect/oxc runtime → [5] user source
    PrototypeUtil.setFilePath(constructor, StackUtil.getCalleeFromStack(false, 5));

    // Register each agent route
    for (const route of AGENT_ROUTES) {
      // Inject default implementation if method not defined
      if (!constructor.prototype[route.methodName]) {
        constructor.prototype[route.methodName] = createNotImplemented(route.methodName, route.hasParam);
      }

      // Set method controller type
      MethodInfoUtil.setMethodControllerType(constructor, route.methodName, ControllerType.HTTP);

      // Set HTTP method (GET/POST)
      HTTPInfoUtil.setHTTPMethodMethod(route.httpMethod, constructor, route.methodName);

      // Set HTTP path
      HTTPInfoUtil.setHTTPMethodPath(route.path, constructor, route.methodName);

      // Set parameter metadata
      if (route.paramType === 'body') {
        HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.BODY, 0, constructor, route.methodName);
      } else if (route.paramType === 'pathParam') {
        HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.PARAM, 0, constructor, route.methodName);
        HTTPInfoUtil.setHTTPMethodParamName(route.paramName!, 0, constructor, route.methodName);
      }
    }

    // Mark the class as an AgentController for precise detection
    AgentInfoUtil.setIsAgentController(constructor);
  };
}
