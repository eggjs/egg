import type { EggProtoImplClass, SingletonProtoParams } from '@eggjs/tegg-types';

export interface IBoundModelMetadata extends SingletonProtoParams {
  modelName: string;
  tools?: EggProtoImplClass[];
  mcpServers?: string[];
}

export class BoundModelMetadata {
  modelName: string;
  tools?: EggProtoImplClass[];
  mcpServers?: string[];

  constructor(params: IBoundModelMetadata) {
    this.modelName = params.modelName;
    this.tools = params.tools;
    this.mcpServers = params.mcpServers;
  }
}
