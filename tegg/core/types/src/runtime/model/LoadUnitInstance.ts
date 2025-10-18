import type { LoadUnit } from '../../metadata/index.ts';
import type { EggContainer } from './EggContainer.ts';

export interface LoadUnitInstanceLifecycleContext {
  loadUnit: LoadUnit;
}

export interface LoadUnitInstance extends EggContainer<LoadUnitInstanceLifecycleContext> {
  readonly name: string;
  readonly loadUnit: LoadUnit;
}
