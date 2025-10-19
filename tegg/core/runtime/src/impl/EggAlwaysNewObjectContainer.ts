import { ObjectInitType } from '@eggjs/tegg-types';
import type { EggContainer, EggObject, EggObjectName, EggPrototype, Id, LifecycleContext } from '@eggjs/tegg-types';

import { EggObjectFactory } from '../factory/EggObjectFactory.ts';
import { EggContainerFactory } from '../factory/EggContainerFactory.ts';

export class EggAlwaysNewObjectContainer implements EggContainer<LifecycleContext> {
  static instance: EggAlwaysNewObjectContainer = new EggAlwaysNewObjectContainer();
  readonly id: Id;

  constructor() {
    this.id = 'ALWAYS_NEW_OBJECT_CONTAINER';
  }

  addProtoToCreate(): void {
    return;
  }

  deleteProtoToCreate(): void {
    return;
  }

  iterateProtoToCreate(): IterableIterator<[EggObjectName, EggPrototype]> {
    return new Map().entries();
  }

  getEggObject(): EggObject {
    throw new Error('Always Object can not use getEggObject, should use getOrCreateEggObject');
  }

  async getOrCreateEggObject(name: string, proto: EggPrototype): Promise<EggObject> {
    return EggObjectFactory.createObject(name, proto);
  }

  async destroy(): Promise<void> {
    // do nothing
  }

  async init(): Promise<void> {
    // do nothing
  }
}

EggContainerFactory.registerContainerGetMethod(ObjectInitType.ALWAYS_NEW, () => EggAlwaysNewObjectContainer.instance);
