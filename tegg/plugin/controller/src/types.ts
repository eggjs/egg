import '@eggjs/tegg-plugin/types';
import type { ControllerMetaBuilderFactory } from '@eggjs/controller-decorator';
import type { ControllerRegisterFactory, RootProtoManager } from '@eggjs/controller-runtime';

declare module 'egg' {
  interface Application {
    rootProtoManager: RootProtoManager;
    controllerRegisterFactory: ControllerRegisterFactory;
    controllerMetaBuilderFactory: typeof ControllerMetaBuilderFactory;
  }
}
