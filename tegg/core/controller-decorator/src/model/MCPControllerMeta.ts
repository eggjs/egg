import { ControllerType } from '@eggjs/tegg-types';
import type {
  ControllerMetadata,
  EggProtoImplClass,
  EggPrototypeName,
  IAdvice,
  MCPControllerParams,
  MiddlewareFunc,
} from '@eggjs/tegg-types';

import { ControllerAdviceMeta } from './ControllerAdviceMeta.ts';
import { MCPPromptMeta } from './MCPPromptMeta.ts';
import { MCPResourceMeta } from './MCPResourceMeta.ts';
import { MCPToolMeta } from './MCPToolMeta.ts';

export class MCPControllerMeta implements ControllerMetadata {
  readonly protoName: EggPrototypeName;
  readonly controllerName: string;
  readonly className: string;
  readonly methods: never[];
  readonly middlewares: readonly MiddlewareFunc[];
  readonly advices: readonly EggProtoImplClass<IAdvice>[];
  readonly type: ControllerType = ControllerType.MCP;
  readonly name?: string;
  readonly version: string;
  readonly needAcl: boolean;
  readonly aclCode?: string;
  readonly tools: MCPToolMeta[];
  readonly resources: MCPResourceMeta[];
  readonly prompts: MCPPromptMeta[];
  readonly timeout?: number;

  get id(): string {
    return `${this.name ?? this.controllerName}:${this.version}`;
  }

  constructor(
    className: string,
    protoName: EggPrototypeName,
    controllerName: string,
    version: string,
    tools: MCPToolMeta[],
    resources: MCPResourceMeta[],
    prompts: MCPPromptMeta[],
    middlewares: MiddlewareFunc[],
    name?: string,
    needAcl?: boolean,
    aclCode?: string,
    meta?: MCPControllerParams,
    advices: EggProtoImplClass<IAdvice>[] = [],
  ) {
    this.protoName = protoName;
    this.controllerName = controllerName;
    this.className = className;
    this.name = name;
    this.version = version;
    this.tools = tools;
    this.resources = resources;
    this.prompts = prompts;
    this.middlewares = middlewares;
    this.advices = advices;
    this.methods = [];
    this.needAcl = !!needAcl;
    this.aclCode = aclCode;
    this.timeout = meta?.timeout;
  }

  getMethodMiddlewares(method: MCPPromptMeta | MCPToolMeta | MCPResourceMeta): readonly MiddlewareFunc[] {
    if (this.middlewares.length) {
      return [...this.middlewares, ...method.middlewares];
    }
    return method.middlewares;
  }

  getMethodAdvices(
    method: MCPPromptMeta | MCPToolMeta | MCPResourceMeta,
    includeControllerAdvices = true,
  ): readonly ControllerAdviceMeta[] {
    const advices = includeControllerAdvices ? [...method.advices, ...this.advices] : method.advices;
    return advices.map((clazz, index) => new ControllerAdviceMeta(this.className, method.name, clazz, index));
  }

  getControllerAdvices(method: MCPPromptMeta | MCPToolMeta | MCPResourceMeta): readonly ControllerAdviceMeta[] {
    return this.advices.map(
      (clazz, index) => new ControllerAdviceMeta(this.className, method.name, clazz, method.advices.length + index),
    );
  }

  hasMethodAcl(method: MCPPromptMeta | MCPToolMeta | MCPResourceMeta): boolean {
    return method.needAcl || this.needAcl;
  }

  getMethodAcl(method: MCPPromptMeta | MCPToolMeta | MCPResourceMeta): string | undefined {
    return method.aclCode || this.aclCode;
  }
}
