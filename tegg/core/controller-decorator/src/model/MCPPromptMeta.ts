import type { EggProtoImplClass, IAdvice, MiddlewareFunc } from '@eggjs/tegg-types';

import type { PromptArgsSchemaDetail } from '../util/MCPInfoUtil.ts';

export class MCPPromptMeta {
  readonly name: string;
  readonly needAcl: boolean;
  readonly mcpName?: string;
  readonly aclCode?: string;
  readonly description?: string;
  readonly detail?: PromptArgsSchemaDetail;
  readonly middlewares: readonly MiddlewareFunc[];
  readonly advices: readonly EggProtoImplClass<IAdvice>[];
  readonly extra?: number;
  readonly title?: string;

  constructor(opt: {
    name: string;
    middlewares: MiddlewareFunc[];
    advices?: EggProtoImplClass<IAdvice>[];
    needAcl?: boolean;
    aclCode?: string;
    description?: string;
    mcpName?: string;
    detail?: PromptArgsSchemaDetail;
    extra?: number;
    title?: string;
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
    this.title = opt.title;
  }
}
