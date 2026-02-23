import type { SingletonProtoParams, EggProtoImplClass } from '@eggjs/tegg-types';
import { BaseCheckpointSaver } from '@langchain/langgraph';

export interface IGraphMetadata extends SingletonProtoParams {
  nodes?: EggProtoImplClass[];
  edges?: EggProtoImplClass[];
  checkpoint?: EggProtoImplClass<BaseCheckpointSaver> | string;
}

export class GraphMetadata implements IGraphMetadata {
  nodes?: EggProtoImplClass[];
  edges?: EggProtoImplClass[];
  checkpoint?: EggProtoImplClass<BaseCheckpointSaver> | string;

  constructor(params: IGraphMetadata) {
    this.nodes = params.nodes;
    this.edges = params.edges;
    this.checkpoint = params.checkpoint;
  }
}
