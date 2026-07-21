import fs from 'node:fs';
import { createServer as createHttpServer, type Server } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import type { Socket, ListenOptions } from 'node:net';
import os from 'node:os';
import { debuglog } from 'node:util';

import { EggConsoleLogger as ConsoleLogger } from 'egg-logger';

import type { AgentWorkerIO } from './agent.ts';

const debug = debuglog('egg/cluster/worker_protocol/app');

// https://nodejs.org/api/net.html#serverlistenoptions-callback
// https://github.com/nodejs/node/blob/main/node.gypi#L310
// https://docs.python.org/3/library/sys.html#sys.platform
// This option is available only on some platforms, such as Linux 3.9+, DragonFlyBSD 3.6+, FreeBSD 12.0+, Solaris 11.4, and AIX 7.2.5+.
const REUSE_PORT_SUPPORTED_PLATFORMS = ['linux', 'freebsd', 'sunos', 'aix'];

/**
 * Transport used by the app-worker protocol. It extends the agent surface
 * with app-specific worker identity and sticky-session message handling.
 */
export interface AppWorkerIO extends AgentWorkerIO {
  readonly workerId: number | string;
  on(event: string, listener: (...args: any[]) => void): void;
}

export interface AppWorkerProtocolOptions {
  port?: number;
  debugPort?: number;
  https?: object;
  sticky?: boolean;
  stickyWorkerPort?: number;
  reusePort?: boolean;
}

/**
 * Run the app-worker side of the Egg cluster protocol on an already
 * constructed application: wait for readiness, create the HTTP(S) server
 * (sticky / reusePort / debug port variants), report `realport` and
 * `app-start` to the master, and wire graceful exit.
 */
export function startAppWorker(
  app: any,
  options: AppWorkerProtocolOptions,
  io: AppWorkerIO,
  consoleLogger: ConsoleLogger = new ConsoleLogger({ level: process.env.EGG_APP_WORKER_LOGGER_LEVEL }),
): void {
  app.ready(startServer);

  function exitProcess() {
    // Use SIGTERM kill process, ensure trigger the gracefulExit
    io.kill();
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
    const port = (app.options.port = options.port || listenConfig.port);
    const debugPort = options.debugPort;
    const protocol = httpsOptions.key && httpsOptions.cert ? 'https' : 'http';

    // Check reusePort option and validate platform support
    let reusePort = options.reusePort ?? listenConfig.reusePort ?? false;
    if (reusePort && !REUSE_PORT_SUPPORTED_PLATFORMS.includes(os.platform())) {
      reusePort = false;
      debug(
        '[app_worker:%s] platform %s is not supported for reusePort, set reusePort to false',
        process.pid,
        os.platform(),
      );
    }

    debug(
      '[app_worker:%s] listenConfig: %j, real port: %o, protocol: %o, debugPort: %o, reusePort: %o',
      process.pid,
      listenConfig,
      port,
      protocol,
      debugPort,
      reusePort,
    );

    io.send({
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
      io.on('message', (message: string, connection: Socket) => {
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
          consoleLogger.error('[app_worker:%s] port should be number, but got %s(%s)', process.pid, port, typeof port);
          exitProcess();
          return;
        }
        if (reusePort) {
          // https://nodejs.org/api/net.html#serverlistenoptions-callback
          // Use options object when reusePort is enabled
          const listenOptions: ListenOptions = { port, reusePort };
          if (listenConfig.hostname) {
            listenOptions.host = listenConfig.hostname;
          }
          debug('[app_worker:%s] listen with reusePort options %j', process.pid, listenOptions);
          server.listen(listenOptions);
        } else {
          const args = [port];
          if (listenConfig.hostname) {
            args.push(listenConfig.hostname);
          }
          debug('listen options %j', args);
          server.listen(...args);
        }
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
      debug('[app_worker:%s] listening at %j, reusePort: %o', process.pid, address, reusePort);
      io.send({
        to: 'master',
        action: 'app-start',
        data: {
          address,
          workerId: io.workerId,
        },
        reusePort,
      });
    });
  }

  io.gracefulExit({
    logger: consoleLogger,
    label: 'app_worker',
    beforeExit: () => app.close(),
  });
}
