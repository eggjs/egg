import type { EggProtoImplClass } from '../../core-decorator/index.ts';

/**
 * Loader to load class list in module
 */
export interface Loader {
  load(): Promise<EggProtoImplClass[]>;
  // TODO impl loadProto
  // loadProto(): ProtoDescriptor[];
}
