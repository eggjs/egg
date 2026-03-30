import v8 from 'node:v8';

import type { Application } from './application.ts';
import { startEggForSnapshot, type SnapshotEggOptions, type SingleModeApplication } from './start.ts';

/**
 * Build a V8 startup snapshot of an egg application.
 *
 * Call this from the snapshot entry script passed to
 * `node --snapshot-blob=snapshot.blob --build-snapshot snapshot_entry.js`.
 *
 * It loads all metadata (plugins, configs, extensions, services, controllers,
 * router, tegg modules) without creating servers, timers, or connections,
 * then registers serialize/deserialize callbacks with the V8 snapshot API.
 *
 * Example snapshot entry script:
 * ```ts
 * import { buildSnapshot } from 'egg';
 * await buildSnapshot({ baseDir: __dirname });
 * ```
 *
 * Example restoring from snapshot:
 * ```ts
 * import { restoreSnapshot } from 'egg';
 * const app = restoreSnapshot();
 * // app is fully loaded with metadata, ready for server creation
 * ```
 */
export async function buildSnapshot(options: SnapshotEggOptions = {}): Promise<void> {
  const app = await startEggForSnapshot(options);

  // Register snapshot callbacks on agent and application.
  // These handle cleanup of non-serializable resources (file handles, timers)
  // before snapshot and restoration after deserialize.
  if (app.agent && typeof app.agent.registerSnapshotCallbacks === 'function') {
    app.agent.registerSnapshotCallbacks();
  }
  app.registerSnapshotCallbacks();

  v8.startupSnapshot.setDeserializeMainFunction(
    (snapshotData: SnapshotData) => {
      // This function runs when restoring from snapshot.
      // The application object is available via snapshotData.
      // Users should call restoreSnapshot() to get it.
      globalThis.__egg_snapshot_app = snapshotData.app;
    },
    { app } as SnapshotData,
  );
}

/**
 * Restore an egg application from a V8 startup snapshot.
 *
 * Returns the Application instance that was captured during snapshot
 * construction. The application has all metadata pre-loaded (plugins,
 * configs, extensions, services, controllers, router). Loggers and
 * messenger have been automatically re-created by the deserialize callbacks.
 */
export function restoreSnapshot(): Application {
  const app = globalThis.__egg_snapshot_app;
  if (!app) {
    throw new Error(
      'No egg application found in snapshot. ' +
        'Ensure the process was started from a snapshot built with buildSnapshot().',
    );
  }
  return app as Application;
}

interface SnapshotData {
  app: SingleModeApplication;
}

declare global {
  // eslint-disable-next-line no-var
  var __egg_snapshot_app: unknown;
}
