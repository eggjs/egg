// The controller module's DI inner objects (rootProtoManager,
// controllerRegisterFactory) and lifecycle hooks are defined once, host
// agnostically, in @eggjs/controller-runtime (a plain library — it is NOT an
// eggModule). This barrel re-exports the decorated prototypes here so the
// service worker host's own `serviceWorker` eggModule scan registers them
// (`LoaderUtil.loadFile` collects re-exported `@*Proto` classes; the file name
// is irrelevant). The egg host re-exports the same prototypes from its own
// `teggController` plugin module (see @eggjs/controller-plugin's lib/runtimeProtos.ts).
export {
  RootProtoManager,
  ControllerRegisterFactory,
  ControllerLoadUnitHook,
  ControllerPrototypeHook,
} from '@eggjs/controller-runtime';
