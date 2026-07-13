// @eggjs/controller-runtime is a plain library (never scanned), so re-export its
// decorated protos here to let the egg `teggController` eggModule scan register
// them. The fetch host does the same in @eggjs/service-worker-controller.
export {
  RootProtoManager,
  ControllerRegisterFactory,
  ControllerLoadUnitHook,
  ControllerPrototypeHook,
} from '@eggjs/controller-runtime';
