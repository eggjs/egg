import type { BundleModuleLoader } from './index.ts';

declare global {
  // eslint-disable-next-line no-var
  var __EGG_BUNDLE_MODULE_LOADER__: BundleModuleLoader | undefined;
}

export {};
