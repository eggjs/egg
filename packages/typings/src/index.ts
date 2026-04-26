/**
 * Module loader for bundled egg apps. Called with the raw `importModule()`
 * filepath (posix-normalized) before `importResolve`, so bundled apps can
 * serve modules that no longer exist on disk. Return `undefined` to fall
 * through to the standard import path.
 */
export type BundleModuleLoader = (filepath: string) => unknown;

declare global {
  var __EGG_BUNDLE_MODULE_LOADER__: BundleModuleLoader | undefined;
}
