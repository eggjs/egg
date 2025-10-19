import type { EggObjectName, EggPrototypeName } from '../../core-decorator/index.ts';
import type { LifecycleContext, LifecycleObject } from '../../lifecycle/index.ts';
import type { EggPrototype } from '../../metadata/index.ts';
import type { EggObject } from './EggObject.ts';

export interface EggContainer<T extends LifecycleContext> extends LifecycleObject<T> {
  // Call this method in LifecycleHook.preCreate
  // To help container decide which proto should be create
  iterateProtoToCreate(): IterableIterator<[EggObjectName, EggPrototype]>;
  addProtoToCreate(name: EggPrototypeName, proto: EggPrototype): void;
  deleteProtoToCreate(name: EggPrototypeName): void;

  // async method for get or create object
  getOrCreateEggObject(name: EggPrototypeName, proto: EggPrototype): Promise<EggObject>;

  // sync method for get object
  // object should be created before get, or throw Error
  getEggObject(name: EggPrototypeName, proto: EggPrototype): EggObject;
}
