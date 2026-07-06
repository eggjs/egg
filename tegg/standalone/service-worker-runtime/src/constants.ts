export interface ContextProtoMeta {
  protoName: PropertyKey;
  contextKey: symbol;
}

export class ContextProtoProperty {
  static readonly Event: ContextProtoMeta = {
    protoName: 'event',
    contextKey: Symbol.for('tegg:serviceWorker:context#event'),
  };
}
