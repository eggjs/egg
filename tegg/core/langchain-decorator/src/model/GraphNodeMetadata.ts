import type { SingletonProtoParams, EggProtoImplClass } from '@eggjs/tegg-types';

export interface IGraphNodeMetadata extends SingletonProtoParams {
  nodeName: string;
  tools?: EggProtoImplClass[];
  mcpServers?: string[];
}

export class GraphNodeMetadata {
  nodeName: string;
  tools?: EggProtoImplClass[];
  mcpServers?: string[];

  constructor(params: IGraphNodeMetadata) {
    this.nodeName = params.nodeName;
    this.tools = params.tools;
    this.mcpServers = params.mcpServers;
  }
}
