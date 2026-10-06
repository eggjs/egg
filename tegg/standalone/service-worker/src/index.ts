export * from './ServiceWorkerApp.ts';

import { ServiceWorkerApp, type ServiceWorkerAppOptions } from './ServiceWorkerApp.ts';

/** Scan a service-worker application for the standalone bundler. */
export function loadMetadata(
  cwd: string,
  options?: ServiceWorkerAppOptions,
): ReturnType<typeof ServiceWorkerApp.loadMetadata> {
  return ServiceWorkerApp.loadMetadata(cwd, options);
}
