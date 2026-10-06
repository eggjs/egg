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

interface AgentRouteParam {
  index: number;
  type: 'body' | 'pathParam' | 'query';
  name?: string;
}

interface AgentRouteDefinition {
  methodName: string;
  httpMethod: HTTPMethodEnum;
  path: string;
  params: AgentRouteParam[];
}

// Default implementations for unimplemented methods.
// function.length must match the param count for framework param validation.
// Stubs are marked with Symbol.for('AGENT_NOT_IMPLEMENTED') so agent-runtime
// can distinguish them from user-defined methods at enhancement time.
function createNotImplemented(methodName: string, paramCount: number) {
  let fn;
  if (paramCount >= 2) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fn = async function (_a: unknown, _b: unknown) {
      throw new Error(`${methodName} not implemented`);
    };
  } else if (paramCount === 1) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    params: [],
  },
  {
    methodName: 'getThread',
    httpMethod: HTTPMethodEnum.GET,
    path: '/threads/:id',
    params: [{ index: 0, type: 'pathParam', name: 'id' }],
  },
  {
    methodName: 'getLatestRunId',
    httpMethod: HTTPMethodEnum.GET,
    path: '/threads/:id/latest-run',
    params: [{ index: 0, type: 'pathParam', name: 'id' }],
  },
  {
    methodName: 'asyncRun',
    httpMethod: HTTPMethodEnum.POST,
    path: '/runs',
    params: [{ index: 0, type: 'body' }],
  },
  {
    methodName: 'streamRun',
    httpMethod: HTTPMethodEnum.POST,
    path: '/runs/stream',
    params: [{ index: 0, type: 'body' }],
  },
  {
    methodName: 'getRunStream',
    httpMethod: HTTPMethodEnum.GET,
    path: '/runs/:id/stream',
    params: [
      { index: 0, type: 'pathParam', name: 'id' },
      { index: 1, type: 'query', name: 'lastSeq' },
    ],
  },
  {
    methodName: 'syncRun',
    httpMethod: HTTPMethodEnum.POST,
    path: '/runs/wait',
    params: [{ index: 0, type: 'body' }],
  },
  {
    methodName: 'getRun',
    httpMethod: HTTPMethodEnum.GET,
    path: '/runs/:id',
    params: [{ index: 0, type: 'pathParam', name: 'id' }],
  },
  {
    methodName: 'cancelRun',
    httpMethod: HTTPMethodEnum.POST,
    path: '/runs/:id/cancel',
    params: [{ index: 0, type: 'pathParam', name: 'id' }],
  },
];

export function AgentController(): (constructor: EggProtoImplClass) => void {
  return function (constructor: EggProtoImplClass): void {
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
        constructor.prototype[route.methodName] = createNotImplemented(route.methodName, route.params.length);
      }

      // Set method controller type
      MethodInfoUtil.setMethodControllerType(constructor, route.methodName, ControllerType.HTTP);

      // Set HTTP method (GET/POST)
      HTTPInfoUtil.setHTTPMethodMethod(route.httpMethod, constructor, route.methodName);

      // Set HTTP path
      HTTPInfoUtil.setHTTPMethodPath(route.path, constructor, route.methodName);

      // Set parameter metadata
      for (const param of route.params) {
        if (param.type === 'body') {
          HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.BODY, param.index, constructor, route.methodName);
        } else if (param.type === 'pathParam') {
          HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.PARAM, param.index, constructor, route.methodName);
          HTTPInfoUtil.setHTTPMethodParamName(param.name!, param.index, constructor, route.methodName);
        } else if (param.type === 'query') {
          HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.QUERY, param.index, constructor, route.methodName);
          HTTPInfoUtil.setHTTPMethodParamName(param.name!, param.index, constructor, route.methodName);
        }
      }
    }

    // Mark the class as an AgentController for precise detection
    AgentInfoUtil.setAgentController(constructor);
  };
}
