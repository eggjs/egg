import type { EggProtoImplClass } from '../core-decorator/index.ts';
import type { ControllerMetadata } from './model/index.ts';

export interface ControllerMetaBuilder {
  build(): ControllerMetadata | undefined;
}

export type ControllerMetaBuilderCreator = (clazz: EggProtoImplClass) => ControllerMetaBuilder;
