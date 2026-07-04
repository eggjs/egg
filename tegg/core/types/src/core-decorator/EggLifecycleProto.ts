import type { InnerObjectProtoParams } from './InnerObjectProto.ts';

export interface CommonEggLifecycleProtoParams extends InnerObjectProtoParams {
  type: 'LoadUnit' | 'LoadUnitInstance' | 'EggObject' | 'EggPrototype' | 'EggContext' | string;
}

export type EggLifecycleProtoParams = Omit<CommonEggLifecycleProtoParams, 'type'>;
