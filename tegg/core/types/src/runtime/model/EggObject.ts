import type { EggPrototypeName } from '../../core-decorator/index.ts';
import type { LifecycleContext, LifecycleObject } from '../../lifecycle/index.ts';
import type { EggPrototype, LoadUnit } from '../../metadata/index.ts';
import type { EggRuntimeContext } from './EggContext.ts';
import type { LoadUnitInstance } from './LoadUnitInstance.ts';

export enum EggObjectStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  ERROR = 'ERROR',
  DESTROYING = 'DESTROYING',
  DESTROYED = 'DESTROYED',
}

export interface EggObjectLifeCycleContext extends LifecycleContext {
  readonly loadUnit: LoadUnit;
  readonly loadUnitInstance: LoadUnitInstance;
}

export interface EggObject extends LifecycleObject<EggObjectLifeCycleContext> {
  readonly isReady: boolean;
  readonly obj: Record<string | symbol, any>;
  readonly proto: EggPrototype;
  readonly name: EggPrototypeName;
  readonly ctx?: EggRuntimeContext;

  injectProperty(name: string, descriptor: PropertyDescriptor): void;
}
