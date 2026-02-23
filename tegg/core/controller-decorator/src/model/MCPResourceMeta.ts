import type { MiddlewareFunc } from '@eggjs/tegg-types';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ResourceMetadata } from '@modelcontextprotocol/sdk/server/mcp.js';

export class MCPResourceMeta {
  readonly name: string;
  readonly needAcl: boolean;
  readonly aclCode?: string;
  readonly mcpName?: string;
  readonly uri?: string;
  readonly template?: ResourceTemplate;
  readonly metadata?: ResourceMetadata;
  readonly middlewares: readonly MiddlewareFunc[];
  readonly extra?: number;

  constructor(opt: {
    name: string;
    middlewares: MiddlewareFunc[];
    needAcl?: boolean;
    aclCode?: string;
    mcpName?: string;
    uri?: string;
    template?: ConstructorParameters<typeof ResourceTemplate>;
    metadata?: ResourceMetadata;
    extra?: number;
  }) {
    this.name = opt.name;
    this.needAcl = !!opt.needAcl;
    this.uri = opt.uri;
    this.metadata = opt.metadata;
    if (opt.template) {
      this.template = new ResourceTemplate(opt.template[0], opt.template[1]);
    }
    this.middlewares = opt.middlewares;
    this.aclCode = opt.aclCode;
    this.mcpName = opt.mcpName;
    this.extra = opt.extra;
  }
}
