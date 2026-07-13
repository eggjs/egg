// The teggController module's DI inner objects (rootProtoManager,
// controllerRegisterFactory) and its lifecycle hooks are defined ONCE, host
// agnostically, in @eggjs/controller-runtime — which is a plain library, NOT an
// eggModule. This barrel re-exports those decorated prototypes so the EGG host's
// `teggController` eggModule (this plugin package) registers them —
// `LoaderUtil.loadFile` collects re-exported `@*Proto` classes (the file name is
// irrelevant; the loader globs the module dir). The standalone service-worker
// host re-exports the same prototypes into its own `serviceWorker` eggModule
// (see @eggjs/service-worker-controller/src/runtimeProtos.ts). The scanned
// module is always a host package; the runtime library is never scanned.
export {
  RootProtoManager,
  ControllerRegisterFactory,
  ControllerLoadUnitHook,
  ControllerPrototypeHook,
} from '@eggjs/controller-runtime';
