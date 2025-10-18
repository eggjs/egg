import { LoadUnitFactory } from '@eggjs/tegg-metadata';
import type { EggRuntimeContext, EggObject } from '@eggjs/tegg-types';

import { ContextObjectGraph } from './ContextObjectGraph.ts';
import { EggContainerFactory } from '../factory/EggContainerFactory.ts';

const CONTEXT_INITIATOR = Symbol('EggContext#ContextInitiator');

export class ContextInitiator {
  private readonly eggContext: EggRuntimeContext;
  private readonly eggObjectInitRecorder: WeakMap<EggObject, boolean>;

  constructor(eggContext: EggRuntimeContext) {
    this.eggContext = eggContext;
    this.eggObjectInitRecorder = new WeakMap();
    this.eggContext.set(CONTEXT_INITIATOR, this);
  }

  async init(obj: EggObject) {
    if (this.eggObjectInitRecorder.get(obj) === true) {
      return;
    }
    this.eggObjectInitRecorder.set(obj, true);
    const injectObjectProtos = ContextObjectGraph.getContextProto(obj.proto);
    await Promise.all(
      injectObjectProtos.map(async injectObject => {
        const proto = injectObject.proto;
        const loadUnit = LoadUnitFactory.getLoadUnitById(proto.loadUnitId);
        if (!loadUnit) {
          throw new Error(`can not find load unit: ${proto.loadUnitId}`);
        }
        await EggContainerFactory.getOrCreateEggObject(proto, injectObject.objName);
      })
    );
  }

  static createContextInitiator(context: EggRuntimeContext): ContextInitiator {
    let initiator = context.get(CONTEXT_INITIATOR);
    if (!initiator) {
      initiator = new ContextInitiator(context);
      context.set(CONTEXT_INITIATOR, initiator);
    }
    return initiator;
  }
}
