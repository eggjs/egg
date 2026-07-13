import { FrameworkBaseError } from '@eggjs/errors';
import { ErrorCodes } from '@eggjs/tegg-types';
import type { EggPrototypeName, QualifierInfo } from '@eggjs/tegg-types';

function formatQualifiers(qualifiers: readonly QualifierInfo[]): string {
  return `[${qualifiers.map((qualifier) => `${String(qualifier.attribute)}=${String(qualifier.value)}`).join(',')}]`;
}

export class TeggError extends FrameworkBaseError {
  get module() {
    return 'TEGG';
  }
}

export class EggPrototypeNotFound extends TeggError {
  constructor(protoName: EggPrototypeName, loadUnitId: string | undefined) {
    const msg = loadUnitId
      ? `Object ${String(protoName)} not found in ${loadUnitId}`
      : `Object ${String(protoName)} not found`;
    super(msg, ErrorCodes.EGG_PROTO_NOT_FOUND);
  }
}

export class MultiPrototypeFound extends TeggError {
  constructor(name: EggPrototypeName, qualifier: QualifierInfo[], result?: string) {
    const msg = `multi proto found for name:${String(name)} and qualifiers ${formatQualifiers(qualifier)}${
      result ? `, result is ${result}` : ''
    }`;
    super(msg, ErrorCodes.MULTI_PROTO_FOUND);
  }
}

export class IncompatibleProtoInject extends TeggError {
  constructor(msg: string) {
    super(msg, ErrorCodes.INCOMPATIBLE_PROTO_INJECT);
  }
}
