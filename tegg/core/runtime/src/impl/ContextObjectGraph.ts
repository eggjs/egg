import { ObjectInitType } from '@eggjs/tegg-types';
import type { EggPrototype, InjectObjectProto } from '@eggjs/tegg-types';

class InjectProtoHolder {
  private idSet: Set<string> = new Set();
  private injectProtos: Array<InjectObjectProto> = [];

  addInjectProto(injectObjectProto: InjectObjectProto) {
    const id = `${String(injectObjectProto.objName)}:${injectObjectProto.proto.id}`;
    if (this.idSet.has(id)) {
      return;
    }
    this.idSet.add(id);
    this.injectProtos.push(injectObjectProto);
  }

  dumpProtos(): Array<InjectObjectProto> {
    return this.injectProtos;
  }
}

export class ContextObjectGraph {
  private static eggObjectInitRecorder: WeakMap<EggPrototype, Array<InjectObjectProto>> = new WeakMap();

  static getContextProto(proto: EggPrototype): InjectObjectProto[] {
    if (ContextObjectGraph.eggObjectInitRecorder.has(proto)) {
      return ContextObjectGraph.eggObjectInitRecorder.get(proto)!;
    }
    const holder = new InjectProtoHolder();
    this.doGetContextProto(proto, holder);
    const injectObjectProtos = holder.dumpProtos();
    ContextObjectGraph.eggObjectInitRecorder.set(proto, injectObjectProtos);
    return injectObjectProtos;
  }

  private static doGetContextProto(proto: EggPrototype, holder: InjectProtoHolder) {
    for (const injectObject of proto.injectObjects) {
      if (injectObject.proto.initType === ObjectInitType.CONTEXT && proto.initType !== ObjectInitType.CONTEXT) {
        holder.addInjectProto(injectObject);
      }
      ContextObjectGraph.doGetContextProto(injectObject.proto, holder);
    }
  }
}
