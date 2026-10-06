import type { EggProtoImplClass, IAdvice, MiddlewareFunc } from '@eggjs/tegg-types';

import type { ToolArgsSchemaDetail } from '../util/MCPInfoUtil.ts';

export class MCPToolMeta {
  readonly name: string;
  readonly needAcl: boolean;
  readonly aclCode?: string;
  readonly mcpName?: string;
  readonly description?: string;
  readonly detail?: ToolArgsSchemaDetail;
  readonly middlewares: readonly MiddlewareFunc[];
  readonly advices: readonly EggProtoImplClass<IAdvice>[];
  readonly extra?: number;

  constructor(opt: {
    name: string;
    middlewares: MiddlewareFunc[];
    advices?: EggProtoImplClass<IAdvice>[];
    needAcl?: boolean;
    aclCode?: string;
    description?: string;
    mcpName?: string;
    detail?: ToolArgsSchemaDetail;
    extra?: number;
  }) {
    this.name = opt.name;
    this.needAcl = !!opt.needAcl;
    this.description = opt.description;
    this.mcpName = opt.mcpName;
    this.middlewares = opt.middlewares;
    this.advices = opt.advices ?? [];
    this.aclCode = opt.aclCode;
    this.detail = opt.detail;
    this.extra = opt.extra;
  }
}
