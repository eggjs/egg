import { debuglog } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import childProcess from 'node:child_process';
import { once } from 'node:events';
import { Coffee } from 'coffee';
import { Ready } from 'get-ready';
import { request as supertestRequest } from './supertest.js';
import { sleep, rimrafSync, getSourceDirname } from './utils.js';
import { formatOptions } from './format_options.js';
import type { MockClusterOptions, MockClusterApplicationOptions } from './types.js';

const debug = debuglog('@eggjs/mock/lib/cluster');

const clusters = new Map();
const serverBin = path.join(getSourceDirname(), 'lib/start-cluster.js');
const requestCallFunctionFile = path.join(getSourceDirname(), 'lib/request_call_function.js');
let masterPort = 17000;

/**
 * A cluster version of egg.Application, you can test with supertest
 * @example
 * ```js
 * const mm = require('mm');
 * const request = require('supertest');
 *
 * describe('ClusterApplication', () => {
 *   let app;
 *   before(function (done) {
 *     app = mm.cluster({ baseDir });
 *     app.ready(done);
 *   });
 *
 *   after(function () {
 *     app.close();
 *   });
 *
 *   it('should 200', function (done) {
 *     request(app.callback())
 *     .get('/')
 *     .expect(200, done);
 *   });
 * });
 */
export class ClusterApplication extends Coffee {
  [key: string | symbol]: any;
  options: MockClusterApplicationOptions;
  port: number;
  baseDir: string;
  closed: boolean;

  /**
   * @class
   * @param {Object} options
   * - {String} baseDir - The directory of the application
   * - {Object} plugins - Custom you plugins
   * - {String} framework - The directory of the egg framework
   * - {Boolean} [cache=true] - Cache application based on baseDir
   * - {Boolean} [coverage=true] - Switch on process coverage, but it'll be slower
   * - {Boolean} [clean=true] - Remove $baseDir/logs
   * - {Object}  [opt] - opt pass to coffee, such as { execArgv: ['--debug'] }
   * ```
   */
  constructor(options: MockClusterApplicationOptions) {
    const opt = options.opt;
    delete options.opt;

    // incremental port
    options.port = options.port ?? ++masterPort;
    // Set 1 worker when test
    if (!options.workers) {
      options.workers = 1;
    }

    const args = [ JSON.stringify(options) ];
    debug('fork %s, args: %s, opt: %j', serverBin, args.join(' '), opt);
    super({
      method: 'fork',
      cmd: serverBin,
      args,
      opt,
    });

    Ready.mixin(this);

    this.port = options.port;
    this.baseDir = options.baseDir;

    // print stdout and stderr when DEBUG, otherwise stderr.
    this.debug(process.env.DEBUG ? 0 : 2);

    // disable coverage
    if (options.coverage === false) {
      this.coverage(false);
    }

    process.nextTick(() => {
      this.proc.on('message', (msg: any) => {
        // 'egg-ready' and { action: 'egg-ready' }
        const action = msg && msg.action ? msg.action : msg;
        switch (action) {
          case 'egg-ready':
            this.emit('close', 0);
            break;
          case 'app-worker-died':
          case 'agent-worker-died':
            this.emit('close', 1);
            break;
          default:
            // ignore it
            break;
        }
      });
    });

    this.end(() => this.ready(true));
  }

  /**
   * the process that forked
   * @member {ChildProcess}
   */
  get process() {
    return this.proc;
  }

  /**
   * Compatible API for supertest
   */
  callback() {
    return this;
  }

  /**
   * Compatible API for supertest
   * @member {String} url
   * @private
   */
  get url() {
    return 'http://127.0.0.1:' + this.port;
  }

  /**
   * Compatible API for supertest
   */
  address() {
    return {
      port: this.port,
    };
  }

  /**
   * Compatible API for supertest
   */
  listen() {
    return this;
  }

  /**
   * kill the process
   */
  async close() {
    this.closed = true;

    const proc = this.proc;
    const baseDir = this.baseDir;
    if (proc.connected) {
      proc.kill('SIGTERM');
      await once(proc, 'exit');
    }

    clusters.delete(baseDir);
    debug('delete cluster cache %s, remain %s', baseDir, [ ...clusters.keys() ]);

    if (os.platform() === 'win32') {
      await sleep(1000);
    }
  }

  get isClosed() {
    return this.closed;
  }

  // mock app.router.pathFor(name) api
  get router() {
    const self = this;
    return {
      pathFor(url: string) {
        return self._callFunctionOnAppWorker('pathFor', [ url ], 'router', true);
      },
    };
  }

  /**
   * get app[property] value in app worker
   */
  getAppInstanceProperty(property: string) {
    return this._callFunctionOnAppWorker('__getter__', [], property, true);
  }

  /**
   * collection logger message, then can be use on `expectLog()`
   * it's different from `app.expectLog()`, only support string params.
   *
   * @param {String} [logger] - logger instance name, default is `logger`
   * @function ClusterApplication#expectLog
   */
  mockLog(logger?: string) {
    logger = logger ?? 'logger';
    this._callFunctionOnAppWorker('mockLog', [ logger ], null, true);
  }

  /**
   * expect str in the logger
   * it's different from `app.expectLog()`, only support string params.
   *
   * @param {String} str - test str
   * @param {String} [logger] - logger instance name, default is `logger`
   * @function ClusterApplication#expectLog
   */
  expectLog(str: string, logger?: string) {
    logger = logger ?? 'logger';
    this._callFunctionOnAppWorker('expectLog', [ str, logger ], null, true);
  }

  /**
   * not expect str in the logger
   * it's different from `app.notExpectLog()`, only support string params.
   *
   * @param {String} str - test str
   * @param {String} [logger] - logger instance name, default is `logger`
   * @function ClusterApplication#notExpectLog
   */
  notExpectLog(str: string, logger?: string) {
    logger = logger ?? 'logger';
    this._callFunctionOnAppWorker('notExpectLog', [ str, logger ], null, true);
  }

  httpRequest() {
    return supertestRequest(this);
  }

  _callFunctionOnAppWorker(method: string, args: any[] = [], property: any = undefined, needResult = false) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (typeof arg === 'function') {
        args[i] = {
          __egg_mock_type: 'function',
          value: arg.toString(),
        };
      } else if (arg instanceof Error) {
        const errObject: any = {
          __egg_mock_type: 'error',
          name: arg.name,
          message: arg.message,
          stack: arg.stack,
        };
        for (const key in arg) {
          if (key !== 'name' && key !== 'message' && key !== 'stack') {
            errObject[key] = (arg as any)[key];
          }
        }
        args[i] = errObject;
      }
    }
    const data = {
      port: this.port,
      method,
      args,
      property,
      needResult,
    };
    const child = childProcess.spawnSync(process.execPath, [
      requestCallFunctionFile,
      JSON.stringify(data),
    ], {
      stdio: 'pipe',
    });
    // if (child.stderr && child.stderr.length > 0) {
    //   console.error(child.stderr.toString());
    // }
    let result;
    if (child.stdout && child.stdout.length > 0) {
      if (needResult) {
        result = JSON.parse(child.stdout.toString());
      } else {
        console.error(child.stdout.toString());
      }
    }

    if (child.status !== 0) {
      throw new Error(child.stderr.toString());
    }
    if (child.error) {
      throw child.error;
    }

    return result;
  }
}

export function createCluster(initOptions?: MockClusterOptions) {
  const options = formatOptions(initOptions) as MockClusterApplicationOptions;
  if (options.cache && clusters.has(options.baseDir)) {
    const clusterApp = clusters.get(options.baseDir);
    // return cache when it hasn't been killed
    if (!clusterApp.isClosed) {
      return clusterApp;
    }

    // delete the cache when it's closed
    clusters.delete(options.baseDir);
  }

  if (options.clean !== false) {
    const logDir = path.join(options.baseDir, 'logs');
    try {
      rimrafSync(logDir);
    } catch (err: any) {
      console.error(`remove log dir ${logDir} failed: ${err.stack}`);
    }
    const runDir = path.join(options.baseDir, 'run');
    try {
      rimrafSync(runDir);
    } catch (err: any) {
      console.error(`remove run dir ${runDir} failed: ${err.stack}`);
    }
  }

  let clusterApp = new ClusterApplication(options);
  clusterApp = new Proxy(clusterApp, {
    get(target, prop) {
      debug('proxy handler.get %s', prop);
      // proxy mockXXX function to app worker
      const method = prop;
      if (typeof method === 'string' && /^mock\w+$/.test(method) && target[method] === undefined) {
        return function mockProxy(...args: any[]) {
          return target._callFunctionOnAppWorker(method, args, null, true);
        };
      }
      return target[prop];
    },
  });

  clusters.set(options.baseDir, clusterApp);
  return clusterApp;
}

// export to let mm.restore() worked
export async function restore() {
  for (const clusterApp of clusters.values()) {
    // will proxy to app.mockRestore()
    await clusterApp.mockRestore();
  }
}

// ensure to close App process on test exit.
process.on('exit', () => {
  for (const clusterApp of clusters.values()) {
    debug('on exit close clusterApp, port: %s', clusterApp.port);
    clusterApp.close();
  }
});
