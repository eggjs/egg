import '@eggjs/tegg-plugin/types';
import type { ControllerMetaBuilderFactory } from '@eggjs/controller-decorator';

import type { ControllerRegisterFactory } from './lib/ControllerRegisterFactory.ts';
import type { RootProtoManager } from './lib/RootProtoManager.ts';

declare module 'egg' {
  interface Application {
    rootProtoManager: RootProtoManager;
    controllerRegisterFactory: ControllerRegisterFactory;
    controllerMetaBuilderFactory: typeof ControllerMetaBuilderFactory;
  }
}
