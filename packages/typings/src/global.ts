import type { BundleModuleLoader, ModuleImporter } from './index.ts';

declare global {
  // eslint-disable-next-line no-var
  var __EGG_BUNDLE_MODULE_LOADER__: BundleModuleLoader | undefined;
  /**
   * Tegg manifest inlined into a standalone worker bundle. Kept as `unknown`
   * to avoid coupling typings to the tegg loader package.
   */
  // eslint-disable-next-line no-var
  var __EGG_BUNDLE_MANIFEST__: unknown;
  // eslint-disable-next-line no-var
  var __EGG_MODULE_IMPORTER__: ModuleImporter | undefined;
  /**
   * Synchronous require bound to the bundle output directory, installed by the
   * snapshot restore main function. The snapshot prelude / lazy mechanism uses it
   * to pull in modules through `require()` (Node 22+ can `require()` ESM) because a
   * deserialized snapshot process has no dynamic `import()` callback. It also carries
   * a `resolve` (the underlying `createRequire(...).resolve`) so the web globals
   * re-installer can locate `undici` through the app dependency tree.
   */
  // eslint-disable-next-line no-var
  var __RUNTIME_REQUIRE:
    | (((id: string) => unknown) & { resolve?: (id: string, options?: { paths?: string[] }) => string })
    | undefined;
  /**
   * Re-install the web globals (`fetch`/`Headers`/.../`Blob`/`File`) that the snapshot
   * prelude replaces with stubs at build time, as lazy accessors backed by `undici`
   * (the fetch family) and `node:buffer` (`Blob`/`File`). Defined by the snapshot
   * prelude and serialized into the blob; the snapshot restore main calls it once
   * `__RUNTIME_REQUIRE` is installed, so an app that uses `globalThis.fetch` keeps
   * working after a restore.
   */
  // eslint-disable-next-line no-var
  var __installWebGlobalsLazy: (() => void) | undefined;
}

export {};
