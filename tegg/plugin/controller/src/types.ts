import '@eggjs/tegg-plugin/types';
import type { ControllerMetaBuilderFactory } from '@eggjs/tegg';

import type { RootProtoManager } from './lib/RootProtoManager.ts';
import type { ControllerRegisterFactory } from './lib/ControllerRegisterFactory.ts';

declare module 'egg' {
  interface Application {
    rootProtoManager: RootProtoManager;
    controllerRegisterFactory: ControllerRegisterFactory;
    controllerMetaBuilderFactory: typeof ControllerMetaBuilderFactory;
  }
}
