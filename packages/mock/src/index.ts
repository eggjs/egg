import mm from 'mm';
import { mock as _mock } from 'mm';
import { createCluster } from './lib/cluster.js';
import { createApp } from './lib/app.js';
// import { getMockAgent } from './lib/mock_agent.js';
import { restore } from './lib/restore.js';
import { setGetAppCallback } from './lib/app_handler.js';
import ApplicationUnittest from './app/extend/application.js';

export * from './lib/types.js';

// egg-bin will set this flag to require files for instrument
// if (process.env.EGG_BIN_PREREQUIRE) {
//   require('./lib/prerequire');
// }

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
  env(env: string) {
    _mock(process.env, 'EGG_MOCK_SERVER_ENV', env);
    _mock(process.env, 'EGG_SERVER_ENV', env);
  },

  /**
   * mock console level
   * @param {String} level - logger level
   */
  consoleLevel(level: string) {
    level = (level || '').toUpperCase();
    _mock(process.env, 'EGG_LOG', level);
  },

  home(homePath?: string) {
    if (homePath) {
      _mock(process.env, 'EGG_HOME', homePath);
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
}) as unknown as ((target: any, property: PropertyKey, value?: any) => void) & typeof mock;

export default proxyMock;

export {
  proxyMock as mock,
  // alias to mm
  proxyMock as mm,
  ApplicationUnittest as MockApplication,
  setGetAppCallback,
  createApp,
  createCluster,
};

process.setMaxListeners(100);

process.once('SIGQUIT', () => {
  process.exit(0);
});

process.once('SIGTERM', () => {
  process.exit(0);
});

process.once('SIGINT', () => {
  process.exit(0);
});
