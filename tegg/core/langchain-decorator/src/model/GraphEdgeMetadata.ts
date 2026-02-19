import type { SingletonProtoParams } from '@eggjs/tegg-types';

export interface IGraphEdgeMetadata extends SingletonProtoParams {
  fromNodeName: string;
  toNodeNames: string[];
}

export class GraphEdgeMetadata {
  fromNodeName: string;
  toNodeNames: string[];

  constructor(params: IGraphEdgeMetadata) {
    this.fromNodeName = params.fromNodeName;
    this.toNodeNames = params.toNodeNames;
  }
}
