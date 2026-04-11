import http from 'node:http';
import { debuglog } from 'node:util';

import { importModule } from '@eggjs/utils';

const debug = debuglog('egg/scripts/start-single/esm');

async function main() {
  debug('argv: %o', process.argv);
  const options = JSON.parse(process.argv[2]);
  debug('start single options: %o', options);
  const framework = await importModule(options.framework);
  const startEgg = framework.start ?? framework.startEgg;
  if (typeof startEgg !== 'function') {
    throw new Error(`Cannot find start/startEgg function from framework: ${options.framework}`);
  }
  const app = await startEgg({
    baseDir: options.baseDir,
    framework: options.framework,
    env: options.env,
    mode: 'single',
  });

  const port = options.port ?? 7001;
  const server = http.createServer(app.callback());
  app.emit('server', server);

  await new Promise((resolve, reject) => {
    server.listen(port, () => {
      resolve(undefined);
    });
    server.once('error', reject);
  });

  const address = server.address();
  const url = typeof address === 'string' ? address : `http://127.0.0.1:${address.port}`;

  debug('server started on %s', url);

  // notify parent process (daemon mode)
  if (process.send) {
    process.send({
      action: 'egg-ready',
      data: { address: url, port: address.port ?? port },
    });
  }

  // graceful shutdown
  const shutdown = async (signal) => {
    debug('receive signal %s, closing server', signal);
    server.close(() => {
      debug('server closed');
      if (typeof app.close === 'function') {
        app
          .close()
          .then(() => {
            process.exit(0);
          })
          .catch(() => {
            process.exit(1);
          });
      } else {
        process.exit(0);
      }
    });
    // force exit after timeout
    setTimeout(() => {
      process.exit(1);
    }, 10000).unref();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGQUIT', () => shutdown('SIGQUIT'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
