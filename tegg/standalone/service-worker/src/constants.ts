import { ProtoMeta } from './types.ts';

export class ContextProtoProperty {
  static readonly Event: ProtoMeta = {
    protoName: 'event',
    contextKey: Symbol('context#event'),
  };
}
