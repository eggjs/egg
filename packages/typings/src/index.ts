/**
 * Module loader for bundled Egg apps. Called with the `importModule()` filepath
 * after POSIX path normalization. Return `undefined` to fall through to the
 * standard import path.
 */
export type BundleModuleLoader = (filepath: string) => unknown;
