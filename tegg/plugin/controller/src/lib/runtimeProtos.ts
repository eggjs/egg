// Re-export decorated runtime protos through the scanned host package.
// RootProtoManager is instead provided through app.rootProtoManager.
export {
  ControllerGraphHookRegistrar,
  ControllerRegisterFactory,
  ControllerLoadUnitHook,
  ControllerPrototypeHook,
} from '@eggjs/controller-runtime';
