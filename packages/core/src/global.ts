import type { ManifestStore } from './loader/manifest.ts';

declare global {
  var __EGG_BUNDLE_STORE__: ManifestStore | undefined;
  var __EGG_BUNDLE_FILE_LOADER__: ((filepath: string) => string | undefined) | undefined;
  var __EGG_BUNDLE_MODULE_LOADER__: ((filepath: string) => unknown) | undefined;
}

export {};
