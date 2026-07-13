export type EggLifecycleType = 'LoadUnit' | 'LoadUnitInstance' | 'EggObject' | 'EggPrototype' | 'EggContext';

export interface EggLifecycleInfo {
  type: EggLifecycleType;
}
