import { LoadUnitFactory } from '@eggjs/metadata';
import type { EggRuntimeContext, EggObject } from '@eggjs/tegg-types';

import { EggContainerFactory } from '../factory/EggContainerFactory.ts';
import { ContextObjectGraph } from './ContextObjectGraph.ts';

const CONTEXT_INITIATOR = Symbol('EggContext#ContextInitiator');

export class ContextInitiator {
  private readonly eggContext: EggRuntimeContext;
  private readonly eggObjectInitRecorder: WeakMap<EggObject, boolean>;
  private readonly eggObjectInitPromise: WeakMap<EggObject, Promise<void[]>>;

  constructor(eggContext: EggRuntimeContext) {
    this.eggContext = eggContext;
    this.eggObjectInitRecorder = new WeakMap();
    this.eggObjectInitPromise = new WeakMap();
    this.eggContext.set(CONTEXT_INITIATOR, this);
  }

  async init(obj: EggObject): Promise<void> {
    if (this.eggObjectInitRecorder.get(obj) === true) {
      if (this.eggObjectInitPromise.has(obj)) {
        await this.eggObjectInitPromise.get(obj);
      }
      return;
    }
    this.eggObjectInitRecorder.set(obj, true);
    const injectObjectProtos = ContextObjectGraph.getContextProto(obj.proto);
    const initPromise = Promise.all(
      injectObjectProtos.map(async (injectObject) => {
        const proto = injectObject.proto;
        const loadUnit = LoadUnitFactory.getLoadUnitById(proto.loadUnitId);
        if (!loadUnit) {
          throw new Error(`can not find load unit: ${proto.loadUnitId}`);
        }
        await EggContainerFactory.getOrCreateEggObject(proto, injectObject.objName);
      }),
    );
    this.eggObjectInitPromise.set(obj, initPromise);
    await initPromise;
    this.eggObjectInitPromise.delete(obj);
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
