import type { ManifestStore } from './loader/manifest.ts';

declare global {
  var __EGG_BUNDLE_STORE__: ManifestStore | undefined;
}

export {};
