import type { Id } from '@eggjs/tegg-types';

export class IdenticalUtil {
  private static objIndex = 0;
  private static protoIndex = 0;
  private static ctxIndex = 0;

  static createLoadUnitId(loadUnitName: string): Id {
    // LOAD_UNIT:xxx
    return `LOAD_UNIT:${loadUnitName}`;
  }

  static createProtoId(loadUnitId: Id, name: PropertyKey): Id {
    // LOAD_UNIT:xxx:PROTO:CONTEXT:xxx
    return `${loadUnitId}:PROTO:${this.protoIndex++}:${String(name)}`;
  }

  static createLoadUnitInstanceId(loadUnitId: Id): Id {
    // LOAD_UNIT:xxx:INSTANCE
    return `${loadUnitId}:INSTANCE`;
  }

  static createContextId(traceId?: string) {
    // CONTEXT:0
    if (traceId) {
      return `CONTEXT:${traceId}:${this.ctxIndex++}`;
    }
    return `CONTEXT:${this.ctxIndex++}`;
  }

  static createObjectId(protoId: Id, ctxId?: Id) {
    if (ctxId) {
      // LOAD_UNIT:xxx:PROTO:CONTEXT:xxx:INSTANCE:CONTEXT:0
      return `${protoId}:INSTANCE:${ctxId}`;
    }
    // LOAD_UNIT:xxx:PROTO:CONTEXT:xxx:INSTANCE:0
    return `${protoId}:INSTANCE:${this.objIndex++}`;
  }
}
