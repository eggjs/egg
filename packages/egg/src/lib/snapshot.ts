import v8 from 'node:v8';

import type { Application } from './application.ts';
import { startEgg, type StartEggOptions, type SingleModeApplication } from './start.ts';

/**
 * Build a V8 startup snapshot of an egg application.
 *
 * Call this from the snapshot entry script passed to
 * `node --snapshot-blob=snapshot.blob --build-snapshot snapshot_entry.js`.
 *
 * It loads all metadata (plugins, configs, extensions, services, controllers,
 * router, tegg modules), triggers snapshotWillSerialize hooks to clean up
 * non-serializable resources (file handles, timers, process listeners),
 * then registers a V8 deserialize callback to stash the app for later restore.
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
 * const app = await restoreSnapshot();
 * // app is fully restored with resources recreated, ready for server creation
 * ```
 */
export async function buildSnapshot(
  options: Pick<StartEggOptions, 'framework' | 'baseDir' | 'env' | 'plugins'> = {},
): Promise<void> {
  const app = await startEgg({ ...options, snapshot: true });

  // Use lifecycle hooks to clean up non-serializable resources (file handles,
  // timers, process listeners) before snapshot and restore them after deserialize.
  // The hooks are registered internally by Agent and EggApplicationCore constructors.
  if (app.agent) {
    await app.agent.triggerSnapshotWillSerialize();
  }
  await app.triggerSnapshotWillSerialize();

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
 * Triggers the snapshotDidDeserialize lifecycle hooks to recreate
 * non-serializable resources (messenger, loggers, process listeners)
 * and resumes the lifecycle from configDidLoad through didReady.
 *
 * Returns the fully restored Application instance with all metadata
 * pre-loaded (plugins, configs, extensions, services, controllers, router).
 */
export async function restoreSnapshot(): Promise<Application> {
  const app = globalThis.__egg_snapshot_app as SingleModeApplication | undefined;
  if (!app) {
    throw new Error(
      'No egg application found in snapshot. ' +
        'Ensure the process was started from a snapshot built with buildSnapshot().',
    );
  }

  // Trigger deserialize hooks to restore non-serializable resources
  // (messenger, loggers, process listeners) and resume lifecycle.
  if (app.agent) {
    await app.agent.triggerSnapshotDidDeserialize();
  }
  await app.triggerSnapshotDidDeserialize();

  return app;
}

interface SnapshotData {
  app: SingleModeApplication;
}

declare global {
  // eslint-disable-next-line no-var
  var __egg_snapshot_app: unknown;
}
