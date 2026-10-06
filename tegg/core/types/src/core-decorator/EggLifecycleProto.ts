import type { InnerObjectProtoParams } from './InnerObjectProto.ts';
import type { EggLifecycleType } from './model/EggLifecycleInfo.ts';

export interface CommonEggLifecycleProtoParams extends InnerObjectProtoParams {
  type: EggLifecycleType;
}

export type EggLifecycleProtoParams = Omit<CommonEggLifecycleProtoParams, 'type'>;
