import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { SecureContextOptions } from 'node:tls';
import { getFrameworkPath, importModule } from '@eggjs/utils';

export interface ClusterHTTPSSecureOptions {
  key: SecureContextOptions['key'];
  cert: SecureContextOptions['cert'];
  ca?: SecureContextOptions['ca'];
  passphrase?: SecureContextOptions['passphrase'];
}

export type ClusterStartMode = 'process' | 'worker_threads';

/** Cluster start options */
export interface ClusterOptions {
  /**
   * specify framework that can be absolute path or npm package
   */
  framework?: string;
  /**
   * @deprecated please use framework instead
   */
  customEgg?: string;
  /** directory of application, default to `process.cwd()` */
  baseDir?: string;
  /**
   * numbers of app workers, default to `os.cpus().length`
   */
  workers?: number | string;
  /**
   * listening port, default to `7001`(http) or `8443`(https)
   */
  port?: number | string | null;
  /**
   * listening a debug port on http protocol
   */
  debugPort?: number;
  /**
   * https options, { key, cert, ca }, full path
   */
  https?: ClusterHTTPSSecureOptions | boolean;
  /**
   * @deprecated please use `options.https.key` instead
   */
  key?: ClusterHTTPSSecureOptions['key'];
  /**
   * @deprecated please use `options.https.cert` instead
   */
  cert?: ClusterHTTPSSecureOptions['cert'];
  /**
   * will inject into worker/agent process
   */
  require?: string | string[];
  /**
   * will save master pid to this file
   */
  pidFile?: string;
  /**
   * custom env, default is `process.env.EGG_SERVER_ENV`
   */
  env?: string;
  /**
   * default is `'process'`, use `'worker_threads'` to start the app & agent worker by worker_threads
   */
  startMode?: ClusterStartMode;
  /**
   * startup port of each app worker, such as: `[7001, 7002, 7003]`, only effects when the startMode is `'worker_threads'`
   */
  ports?: number[];
  /**
   * sticky mode server
   */
  sticky?: boolean;
  /** customized plugins, for unittest */
  plugins?: object;
  isDebug?: boolean;
}

export interface ParsedClusterOptions extends ClusterOptions {
  port?: number;
  baseDir: string;
  workers: number;
  framework: string;
  startMode: ClusterStartMode;
}

export async function parseOptions(options?: ClusterOptions) {
  options = {
    baseDir: process.cwd(),
    port: options?.https ? 8443 : undefined,
    startMode: 'process',
    // ports: [],
    env: process.env.EGG_SERVER_ENV,
    ...options,
  };

  const pkgPath = path.join(options.baseDir!, 'package.json');
  assert(fs.existsSync(pkgPath), `${pkgPath} should exist`);

  options.framework = getFrameworkPath({
    baseDir: options.baseDir!,
    // compatible customEgg only when call startCluster directly without framework
    framework: options.framework ?? options.customEgg,
  });

  const egg = await importModule(options.framework, {
    paths: [ options.baseDir! ],
  });
  assert(egg.Application, `should define Application in ${options.framework}`);
  assert(egg.Agent, `should define Agent in ${options.framework}`);

  if (options.https === true) {
    // Keep compatible options.key, options.cert
    console.warn('[@eggjs/cluster:deprecated] [master] Please use `https: { key, cert, ca }` instead of `https: true`');
    options.https = {
      key: options.key,
      cert: options.cert,
    };
  }

  // https
  if (options.https) {
    assert(options.https.key, 'options.https.key should exists');
    if (typeof options.https.key === 'string') {
      assert(fs.existsSync(options.https.key), 'options.https.key file should exists');
    }
    assert(options.https.cert, 'options.https.cert should exists');
    if (typeof options.https.cert === 'string') {
      assert(fs.existsSync(options.https.cert), 'options.https.cert file should exists');
    }
    if (typeof options.https.ca === 'string') {
      assert(fs.existsSync(options.https.ca), 'options.https.ca file should exists');
    }
  }

  if (options.port && typeof options.port === 'string') {
    options.port = parseInt(options.port);
  }
  if (options.port === null) {
    options.port = undefined;
  }

  if (options.workers && typeof options.workers === 'string') {
    options.workers = parseInt(options.workers);
  }
  if (!options.workers) {
    options.workers = os.cpus().length;
  }

  if (options.require) {
    if (typeof options.require === 'string') {
      options.require = [ options.require ];
    }
  }

  // don't print deprecated message in production env.
  // it will print to stderr.
  if (process.env.NODE_ENV === 'production') {
    process.env.NO_DEPRECATION = '*';
  }

  const isDebug = process.execArgv.some(argv => argv.includes('--debug') || argv.includes('--inspect'));
  if (isDebug) {
    options.isDebug = isDebug;
  }

  return options as ParsedClusterOptions;
}
