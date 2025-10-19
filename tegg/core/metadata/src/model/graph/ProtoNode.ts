import { type GraphNodeObj, type ProtoDescriptor } from '@eggjs/tegg-types';
import { type EdgeMeta } from '@eggjs/tegg-common-util';

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

  toString() {
    return `${String(this.proto.name)}@${this.proto.instanceDefineUnitPath}`;
  }

  selectProto(ctx: ProtoSelectorContext): boolean {
    return ProtoDescriptorHelper.selectProto(this.proto, ctx);
  }

  static createProtoId(proto: ProtoDescriptor): string {
    const id = [
      proto.name,
      proto.instanceModuleName,
      proto.initType,
      ...proto.qualifiers.map(t => String(t.attribute) + String(t.value)),
    ];
    return id.join('@');
  }
}
