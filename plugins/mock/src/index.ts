import mm from "mm";
import { mock as _mock } from "mm";

import { createCluster, type MockClusterApplication } from "./lib/cluster.ts";
import { createApp } from "./lib/app.ts";
// import { getMockAgent } from './lib/mock_agent.js';
import { restore } from "./lib/restore.ts";
import { setGetAppCallback } from "./lib/app_handler.ts";
import type ApplicationUnittest from "./app/extend/application.ts";

export * from "./lib/types.ts";

// egg-bin will set this flag to require files for instrument
// if (process.env.EGG_BIN_PREREQUIRE) {
//   require('./lib/prerequire');
// }

// Define the extended mock type
interface ExtendedMock {
  restore: typeof restore;
  app: typeof createApp;
  cluster: typeof createCluster;
  env: (env: string) => void;
  consoleLevel: (level: string) => void;
  home: (homePath?: string) => void;
  setGetAppCallback: typeof setGetAppCallback;
}

// inherit & extends mm
const mock = {
  ...mm,
  restore,

  /**
   * Create a egg mocked application
   * @function mm#app
   * @param {Object} [options]
   * - {String} baseDir - The directory of the application
   * - {Object} plugins - Custom you plugins
   * - {String} framework - The directory of the egg framework
   * - {Boolean} [true] cache - Cache application based on baseDir
   * - {Boolean} [true] coverage - Switch on process coverage, but it'll be slower
   * - {Boolean} [true] clean - Remove $baseDir/logs
   * @return {App} return {@link Application}
   * @example
   * ```js
   * const app = mm.app();
   * ```
   */
  app: createApp,

  /**
   * Create a egg mocked cluster application
   * @function mm#cluster
   * @see ClusterApplication
   */
  cluster: createCluster,

  /**
   * mock the serverEnv of Egg
   * @member {Function} mm#env
   * @param {String} env - contain default, test, prod, local, unittest
   * @see https://github.com/eggjs/egg-core/blob/master/lib/loader/egg_loader.js#L78
   */
  env(env: string): void {
    _mock(process.env, "EGG_MOCK_SERVER_ENV", env as any);
    _mock(process.env, "EGG_SERVER_ENV", env as any);
  },

  /**
   * mock console level
   * @param {String} level - logger level
   */
  consoleLevel(level: string): void {
    level = (level || "").toUpperCase();
    _mock(process.env, "EGG_LOG", level as any);
  },

  home(homePath?: string): void {
    if (homePath) {
      _mock(process.env, "EGG_HOME", homePath as any);
    }
  },

  setGetAppCallback,
};

// import mm from '@eggjs/mock';
const proxyMock = new Proxy(_mock, {
  apply(target, _, args) {
    return target(args[0], args[1], args[2]);
  },
  get(_target, property, receiver) {
    // import mm from '@eggjs/mock';
    // mm.isMocked(foo, 'bar')
    return Reflect.get(mock, property, receiver);
  },
}) as unknown as ((target: any, property: PropertyKey, value?: any) => void) &
  ExtendedMock &
  typeof mm;

export default proxyMock;

export {
  proxyMock as mock,
  // alias to mm
  proxyMock as mm,
  type MockClusterApplication,
  type ApplicationUnittest as MockApplication,
  setGetAppCallback,
  createApp,
  createCluster,
};

process.setMaxListeners(100);

process.once("SIGQUIT", () => {
  process.exit(0);
});

process.once("SIGTERM", () => {
  process.exit(0);
});

process.once("SIGINT", () => {
  process.exit(0);
});
