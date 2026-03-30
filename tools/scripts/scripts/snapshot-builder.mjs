import http from 'node:http';
import { debuglog } from 'node:util';
import v8 from 'node:v8';

import { importModule } from '@eggjs/utils';

const debug = debuglog('egg/scripts/snapshot-builder');

async function main() {
  debug('argv: %o', process.argv);
  const options = JSON.parse(process.argv[2]);
  debug('snapshot build options: %o', options);

  // Load framework
  const framework = await importModule(options.framework);
  const startEgg = framework.start ?? framework.startEgg;
  if (typeof startEgg !== 'function') {
    throw new Error(`Cannot find start/startEgg function from framework: ${options.framework}`);
  }

  // Initialize the egg app in single mode
  const app = await startEgg({
    baseDir: options.baseDir,
    framework: options.framework,
    env: options.env,
    mode: 'single',
  });

  // Create HTTP server (but don't listen yet)
  const server = http.createServer(app.callback());
  app.emit('server', server);

  const defaultPort = options.port ?? 7001;

  console.log('[snapshot] App initialized, preparing snapshot...');
  debug('app initialized, registering snapshot callbacks');

  // Let the framework register its own serialize/deserialize hooks if supported.
  // This allows the app/agent to clean up and restore framework-specific resources
  // (loggers, watchers, connections) in an extensible way.
  if (typeof app.registerSnapshotCallbacks === 'function') {
    app.registerSnapshotCallbacks();
  }
  if (app.agent && typeof app.agent.registerSnapshotCallbacks === 'function') {
    app.agent.registerSnapshotCallbacks();
  }

  // Clean up external resources before V8 heap serialization.
  // File descriptors, sockets, and timers cannot survive serialization.
  // This is a fallback for frameworks that don't implement registerSnapshotCallbacks.
  v8.startupSnapshot.addSerializeCallback(() => {
    debug('serialize: cleaning up external resources');
    // Close logger file handles
    try {
      if (app.coreLogger && typeof app.coreLogger.close === 'function') {
        app.coreLogger.close();
      }
    } catch {
      /* ignore */
    }
    try {
      if (app.logger && typeof app.logger.close === 'function') {
        app.logger.close();
      }
    } catch {
      /* ignore */
    }
    try {
      if (app.agent?.coreLogger && typeof app.agent.coreLogger.close === 'function') {
        app.agent.coreLogger.close();
      }
    } catch {
      /* ignore */
    }
    try {
      if (app.agent?.logger && typeof app.agent.logger.close === 'function') {
        app.agent.logger.close();
      }
    } catch {
      /* ignore */
    }
  });

  // Re-initialize resources after deserialization
  v8.startupSnapshot.addDeserializeCallback(() => {
    debug('deserialize: re-initializing resources');
    // TODO: Re-open logger file handles, reconnect services, etc.
    // For now, loggers will need to be re-initialized by the app on first write.
  });

  // Set the main function to run when restoring from snapshot.
  // The `data` argument is serialized into the snapshot and passed back on restore.
  v8.startupSnapshot.setDeserializeMainFunction(
    (snapshotData) => {
      const port = parseInt(process.env.PORT || '0') || snapshotData.port;
      const title = process.env.EGG_SERVER_TITLE || snapshotData.title || '';
      debug('deserialize main: starting server on port %d', port);

      if (title) {
        process.title = title;
      }

      server.listen(port, () => {
        const address = server.address();
        const url = typeof address === 'string' ? address : `http://127.0.0.1:${address.port}`;

        debug('server started on %s (from snapshot)', url);
        console.log('[snapshot] Server started on %s', url);

        // Notify parent process (daemon mode IPC)
        if (process.send) {
          process.send({
            action: 'egg-ready',
            data: { address: url, port: address?.port ?? port },
          });
        }
      });

      // Broadcast egg-ready to app and agent messenger
      app.messenger.broadcast('egg-ready');

      // Graceful shutdown
      const shutdown = async (signal) => {
        debug('receive signal %s, closing server', signal);
        server.close(() => {
          debug('server closed');
          if (typeof app.close === 'function') {
            app
              .close()
              .then(() => process.exit(0))
              .catch(() => process.exit(1));
          } else {
            process.exit(0);
          }
        });
        // Force exit after timeout
        setTimeout(() => process.exit(1), 10000).unref();
      };

      process.once('SIGTERM', () => shutdown('SIGTERM'));
      process.once('SIGINT', () => shutdown('SIGINT'));
      process.once('SIGQUIT', () => shutdown('SIGQUIT'));
    },
    {
      port: defaultPort,
      title: options.title || '',
      baseDir: options.baseDir,
    },
  );

  console.log('[snapshot] Snapshot callbacks registered, building snapshot on exit...');
}

main().catch((err) => {
  console.error('[snapshot] Build failed:', err);
  process.exit(1);
});
