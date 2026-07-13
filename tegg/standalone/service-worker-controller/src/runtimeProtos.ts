// @eggjs/controller-runtime is a plain library (never scanned), so re-export its
// decorated protos here to let the `serviceWorker` eggModule scan register them.
// The egg host does the same in @eggjs/controller-plugin.
export {
  RootProtoManager,
  ControllerRegisterFactory,
  ControllerLoadUnitHook,
  ControllerPrototypeHook,
} from '@eggjs/controller-runtime';
