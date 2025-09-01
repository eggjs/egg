import fs from 'node:fs';
import { createServer as createHttpServer, type Server } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import type { Socket } from 'node:net';
import { debuglog } from 'node:util';
import { EggConsoleLogger as ConsoleLogger } from 'egg-logger';
import { importModule } from '@eggjs/utils';
import { BaseAppWorker } from './utils/mode/base/app.js';
import { AppThreadWorker } from './utils/mode/impl/worker_threads/app.js';
import { AppProcessWorker } from './utils/mode/impl/process/app.js';

const debug = debuglog('@eggjs/cluster/app_worker');

async function main() {
  // $ node app_worker.js options-json-string
  const options = JSON.parse(process.argv[2]) as {
    framework: string;
    baseDir: string;
    require?: string[];
    startMode?: 'process' | 'worker_threads';
    port: number;
    debugPort?: number;
    https?: object;
    sticky?: boolean;
    stickyWorkerPort?: number;
  };
  if (options.require) {
    // inject
    for (const mod of options.require) {
      await importModule(mod, {
        paths: [ options.baseDir ],
      });
    }
  }

  let AppWorker: typeof BaseAppWorker;
  if (options.startMode === 'worker_threads') {
    AppWorker = AppThreadWorker as any;
  } else {
    AppWorker = AppProcessWorker as any;
  }

  const consoleLogger = new ConsoleLogger({
    level: process.env.EGG_APP_WORKER_LOGGER_LEVEL,
  });
  const { Application } = await importModule(options.framework, {
    paths: [ options.baseDir ],
  });
  debug('[app_worker:%s] new Application with options %j', process.pid, options);
  let app: any;
  try {
    app = new Application(options);
  } catch (err) {
    consoleLogger.error(err);
    throw err;
  }

  app.ready(startServer);

  function exitProcess() {
    // Use SIGTERM kill process, ensure trigger the gracefulExit
    AppWorker.kill();
  }

  // exit if worker start timeout
  app.once('startTimeout', startTimeoutHandler);

  function startTimeoutHandler() {
    consoleLogger.error('[app_worker] start timeout, exiting with code:1');
    exitProcess();
  }

  function startServer(err?: Error) {
    if (err) {
      consoleLogger.error(err);
      consoleLogger.error('[app_worker] start error, exiting with code:1');
      exitProcess();
      return;
    }

    const clusterConfig = app.config.cluster ?? {};
    const listenConfig = clusterConfig.listen ?? {};
    const httpsOptions = {
      ...clusterConfig.https,
      ...options.https,
    };
    const port = app.options.port = options.port || listenConfig.port;
    const debugPort = options.debugPort;
    const protocol = (httpsOptions.key && httpsOptions.cert) ? 'https' : 'http';
    debug('[app_worker:%s] listenConfig: %j, real port: %o, protocol: %o, debugPort: %o',
      process.pid, listenConfig, port, protocol, debugPort);

    AppWorker.send({
      to: 'master',
      action: 'realport',
      data: {
        port,
        protocol,
      },
    });

    app.removeListener('startTimeout', startTimeoutHandler);

    let server: Server;
    let debugPortServer: Server | undefined;

    // https config
    if (protocol === 'https') {
      httpsOptions.key = fs.readFileSync(httpsOptions.key);
      httpsOptions.cert = fs.readFileSync(httpsOptions.cert);
      httpsOptions.ca = httpsOptions.ca && fs.readFileSync(httpsOptions.ca);
      server = createHttpsServer(httpsOptions, app.callback());
      if (debugPort) {
        debugPortServer = createHttpServer(app.callback());
      }
    } else {
      server = createHttpServer(app.callback());
      if (debugPort) {
        debugPortServer = server;
      }
    }

    server.once('error', (err: any) => {
      consoleLogger.error('[app_worker] server got error: %s, code: %s', err.message, err.code);
      exitProcess();
    });

    // emit `server` event in app
    app.emit('server', server);

    if (options.sticky && options.stickyWorkerPort) {
      // only allow connection from localhost
      server.listen(options.stickyWorkerPort, '127.0.0.1');
      // Listen to messages was sent from the master. Ignore everything else.
      AppWorker.on('message', (message: string, connection: Socket) => {
        if (message !== 'sticky-session:connection') {
          return;
        }
        // Emulate a connection event on the server by emitting the
        // event with the connection the master sent us.
        server.emit('connection', connection);
        connection.resume();
      });
    } else {
      if (listenConfig.path) {
        server.listen(listenConfig.path);
      } else {
        if (typeof port !== 'number') {
          consoleLogger.error('[app_worker:%s] port should be number, but got %s(%s)',
            process.pid, port, typeof port);
          exitProcess();
          return;
        }
        const args = [ port ];
        if (listenConfig.hostname) {
          args.push(listenConfig.hostname);
        }
        debug('listen options %j', args);
        server.listen(...args);
      }
      if (debugPortServer) {
        debug('listen on debug port: %s', debugPort);
        debugPortServer.listen(debugPort);
      }
    }

    server.once('listening', () => {
      let address: any = server.address() || { port };
      if (typeof address === 'string') {
        // https://nodejs.org/api/cluster.html#cluster_event_listening_1
        // Unix domain socket
        address = {
          address,
          addressType: -1,
        };
      }
      debug('[app_worker:%s] listening at %j', process.pid, address);
      AppWorker.send({
        to: 'master',
        action: 'app-start',
        data: {
          address,
          workerId: AppWorker.workerId,
        },
      });
    });
  }

  AppWorker.gracefulExit({
    logger: consoleLogger,
    label: 'app_worker',
    beforeExit: () => app.close(),
  });
}

main();
