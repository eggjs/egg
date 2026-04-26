/**
 * Module loader for bundled Egg apps. Called with the raw `importModule()`
 * filepath after posix normalization. Return `undefined` to fall through to
 * the standard import path.
 */
export type BundleModuleLoader = (filepath: string) => unknown;

declare global {
  var __EGG_BUNDLE_MODULE_LOADER__: BundleModuleLoader | undefined;
}
