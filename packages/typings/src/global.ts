import type { BundleModuleLoader, ModuleImporter } from './index.ts';

declare global {
  // eslint-disable-next-line no-var
  var __EGG_BUNDLE_MODULE_LOADER__: BundleModuleLoader | undefined;
  // eslint-disable-next-line no-var
  var __EGG_MODULE_IMPORTER__: ModuleImporter | undefined;
  /**
   * Synchronous require bound to the bundle output directory, installed by the
   * snapshot restore main function. The snapshot prelude / lazy mechanism uses it
   * to pull in modules through `require()` (Node 22+ can `require()` ESM) because a
   * deserialized snapshot process has no dynamic `import()` callback.
   */
  // eslint-disable-next-line no-var
  var __RUNTIME_REQUIRE: ((id: string) => unknown) | undefined;
}

export {};
