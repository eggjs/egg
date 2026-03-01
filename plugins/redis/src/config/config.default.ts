import type { RedisOptions, ClusterOptions, Redis } from 'ioredis';

export interface RedisClientOptions extends RedisOptions {
  /**
   * Whether to enable weakDependent mode, the redis client start will not block the application start
   *
   * Default to `undefined`
   */
  weakDependent?: boolean;
}

export interface RedisClusterOptions extends ClusterOptions {
  cluster: true;
  nodes: RedisClientOptions[];
}

export interface RedisConfig {
  /**
   * Default redis client config
   *
   * Default to `{}`
   */
  default: RedisClientOptions;
  /**
   * Single Redis or Cluster Redis config
   */
  client?: RedisClientOptions | RedisClusterOptions;
  /**
   * Multi Redis config
   */
  clients?: Record<string, RedisClientOptions>;
  /**
   * redis client will try to use TIME command to detect client is ready or not
   * if your redis server not support TIME command, please set this config to false
   * see https://redis.io/commands/time
   *
   * Default to `true`
   */
  supportTimeCommand: boolean;
  /**
   * Whether to enable redis for `app`
   *
   * Default to `true`
   */
  app: boolean;
  /**
   * Whether to enable redis for `agent`
   *
   * Default to `false`
   */
  agent: boolean;
  /**
   * Customize Redis client class. Use this to replace ioredis with a compatible
   * alternative, such as iovalkey or ioredis-mock for unit testing.
   *
   * When using ioredis-mock, you must also set `weakDependent: true` in the
   * client config to avoid startup hangs (mock clients emit 'ready' synchronously
   * before the plugin's listener is attached).
   *
   * @example
   * ```ts
   * // config/config.unittest.ts
   * import RedisMock from 'ioredis-mock';
   * import type { EggAppInfo, PartialEggConfig } from 'egg';
   *
   * export default function (_appInfo: EggAppInfo): PartialEggConfig {
   *   return {
   *     redis: {
   *       Redis: RedisMock,
   *       client: { host: '127.0.0.1', port: 6379, password: '', db: 0, weakDependent: true },
   *     },
   *   };
   * }
   * ```
   *
   * Default to `undefined`, which means using the built-in ioredis
   */
  Redis?: typeof Redis;
}

export default {
  redis: {
    default: {},
    app: true,
    agent: false,
    supportTimeCommand: true,
    // Single Redis
    // client: {
    //   host: 'host',
    //   port: 'port',
    //   family: 'user',
    //   password: 'password',
    //   db: 'db',
    // },
    //
    // Cluster Redis
    // client: {
    //   cluster: true,
    //   nodes: [{
    //     host: 'host',
    //     port: 'port',
    //     family: 'user',
    //     password: 'password',
    //     db: 'db',
    //   }, {
    //     host: 'host',
    //     port: 'port',
    //     family: 'user',
    //     password: 'password',
    //     db: 'db',
    //   },
    // ]},
    //
    // Multi Redis
    // clients: {
    //   instance1: {
    //     host: 'host',
    //     port: 'port',
    //     family: 'user',
    //     password: 'password',
    //     db: 'db',
    //   },
    //   instance2: {
    //     host: 'host',
    //     port: 'port',
    //     family: 'user',
    //     password: 'password',
    //     db: 'db',
    //   },
    // },
  } as RedisConfig,
};
