export * from './ServiceWorkerApp.ts';

import { ServiceWorkerApp, type ServiceWorkerAppOptions } from './ServiceWorkerApp.ts';

/**
 * Scan-only tegg manifest generation for the bundler CLI. `egg-bin bundle` treats a
 * `--framework` package that exposes `loadMetadata` as a standalone bundle target.
 */
export function loadMetadata(
  cwd: string,
  options?: ServiceWorkerAppOptions,
): ReturnType<typeof ServiceWorkerApp.loadMetadata> {
  return ServiceWorkerApp.loadMetadata(cwd, options);
}
