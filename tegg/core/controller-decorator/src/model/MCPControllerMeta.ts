import { ControllerType } from '@eggjs/tegg-types';
import type { ControllerMetadata, MiddlewareFunc, EggPrototypeName, MCPControllerParams } from '@eggjs/tegg-types';

import { MCPPromptMeta } from './MCPPromptMeta.ts';
import { MCPResourceMeta } from './MCPResourceMeta.ts';
import { MCPToolMeta } from './MCPToolMeta.ts';

export class MCPControllerMeta implements ControllerMetadata {
  readonly protoName: EggPrototypeName;
  readonly controllerName: string;
  readonly className: string;
  readonly methods: never[];
  readonly middlewares: readonly MiddlewareFunc[];
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

  hasMethodAcl(method: MCPPromptMeta | MCPToolMeta | MCPResourceMeta): boolean {
    return method.needAcl || this.needAcl;
  }

  getMethodAcl(method: MCPPromptMeta | MCPToolMeta | MCPResourceMeta): string | undefined {
    return method.aclCode || this.aclCode;
  }
}
