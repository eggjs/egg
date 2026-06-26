/**
 * Module loader for bundled Egg apps. Called with the `importModule()` filepath
 * after POSIX path normalization. Return `undefined` to fall through to the
 * standard import path.
 */
export type BundleModuleLoader = (filepath: string) => unknown;

/**
 * Async module importer override for the tegg loader's file loading.
 *
 * When set, the loader delegates module loading to this importer instead of the
 * built-in `await import(filePath)`. Its main use is testing with a bundler-based
 * test runner (e.g. Vitest): when an app's egg modules are loaded by the loader
 * via the native `import()` while the test file imports the same source through
 * the runner's module graph, the two resolve to *different* module instances —
 * so a class decorated as an egg proto by the loader is not the same class the
 * test references, and `ctx.getEggObject(ClassRef)` fails with "can not get proto".
 *
 * A test runner can inject an importer that routes loading through its own module
 * graph (e.g. `filePath => import(filePath)` evaluated inside the runner context),
 * keeping a single module instance. Return value mirrors `await import()`.
 */
export type ModuleImporter = (filePath: string) => Promise<unknown>;
