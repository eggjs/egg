import { type EdgeMeta } from '@eggjs/tegg-common-util';
import { type GraphNodeObj, type ProtoDescriptor } from '@eggjs/tegg-types';

import { ProtoDescriptorHelper } from '../ProtoDescriptorHelper.ts';
import { type ProtoSelectorContext } from './ProtoSelector.ts';

export class ProtoDependencyMeta implements EdgeMeta {
  injectObj: PropertyKey;

  constructor({ injectObj }: { injectObj: PropertyKey }) {
    this.injectObj = injectObj;
  }

  equal(meta: ProtoDependencyMeta): boolean {
    return this.injectObj === meta.injectObj;
  }

  toString(): string {
    return `inject ${String(this.injectObj)}`;
  }
}

export class ProtoNode implements GraphNodeObj {
  readonly id: string;
  readonly proto: ProtoDescriptor;

  constructor(proto: ProtoDescriptor) {
    this.id = ProtoNode.createProtoId(proto);
    this.proto = proto;
  }

  toString(): string {
    const qualifiers = this.proto.qualifiers
      .map((qualifier) => `${String(qualifier.attribute)}=${String(qualifier.value)}`)
      .join(',');
    return (
      `${String(this.proto.name)}@${this.proto.instanceDefineUnitPath}` +
      ` define:${this.proto.defineModuleName}@${this.proto.defineUnitPath}` +
      ` qualifiers:[${qualifiers}]`
    );
  }

  selectProto(ctx: ProtoSelectorContext): boolean {
    return ProtoDescriptorHelper.selectProto(this.proto, ctx);
  }

  static createProtoId(proto: ProtoDescriptor): string {
    const id = [
      proto.name,
      proto.instanceModuleName,
      proto.initType,
      ...proto.qualifiers.map((t) => String(t.attribute) + String(t.value)),
    ];
    return id.join('@');
  }
}
