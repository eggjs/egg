import type { BundleModuleLoader, ModuleImporter } from './index.ts';

declare global {
  // eslint-disable-next-line no-var
  var __EGG_BUNDLE_MODULE_LOADER__: BundleModuleLoader | undefined;
  // eslint-disable-next-line no-var
  var __EGG_MODULE_IMPORTER__: ModuleImporter | undefined;
}

export {};
