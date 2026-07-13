// @eggjs/controller-runtime is a plain library (never scanned), so re-export its
// decorated protos here to let the egg `teggController` eggModule scan register
// them. The fetch host does the same in @eggjs/service-worker-controller.
//
// RootProtoManager is deliberately NOT re-exported: the egg host mounts it on
// `app.rootProtoManager` in the boot hook (before the inner-object graph builds)
// so it arrives as an APP compat proto — see ControllerAppBootHook.didLoad.
export { ControllerRegisterFactory, ControllerLoadUnitHook, ControllerPrototypeHook } from '@eggjs/controller-runtime';
