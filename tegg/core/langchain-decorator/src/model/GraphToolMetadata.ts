import type { SingletonProtoParams } from '@eggjs/tegg-types';

export interface IGraphToolMetadata extends SingletonProtoParams {
  toolName: string;
  description: string;
  // schema: Parameters<McpServer['tool']>['2'];
}

export class GraphToolMetadata implements IGraphToolMetadata {
  toolName = '';
  description = '';

  constructor(params: IGraphToolMetadata) {
    Object.assign(this, params);
  }
}
