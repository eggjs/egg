import type { EggPrototypeName, QualifierInfo } from '../../core-decorator/index.ts';
import type { LifecycleContext, LifecycleObject } from '../../lifecycle/index.ts';
import type { EggPrototype } from './EggPrototype.ts';
import type { Loader } from './Loader.ts';

export enum EggLoadUnitType {
  MODULE = 'MODULE',
  PLUGIN = 'PLUGIN',
  APP = 'APP',
}

export type EggLoadUnitTypeLike = EggLoadUnitType | string;

export interface LoadUnitLifecycleContext extends LifecycleContext {
  unitPath: string;
  loader: Loader;
}

export interface LoadUnit extends LifecycleObject<LoadUnitLifecycleContext> {
  readonly name: string;
  readonly unitPath: string;
  readonly type: EggLoadUnitTypeLike;

  iterateEggPrototype(): IterableIterator<EggPrototype>;
  registerEggPrototype(proto: EggPrototype): void;
  deletePrototype(proto: EggPrototype): void;
  getEggPrototype(name: EggPrototypeName, qualifiers: QualifierInfo[]): EggPrototype[];
  containPrototype(proto: EggPrototype): boolean;
}

export interface LoadUnitPair {
  loadUnit: LoadUnit;
  ctx: LoadUnitLifecycleContext;
}

export type LoadUnitCreator = (ctx: LoadUnitLifecycleContext) => LoadUnit;
