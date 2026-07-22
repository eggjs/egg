import { spawn, type SpawnOptions, type ChildProcess, execFile as _execFile } from 'node:child_process';
import { mkdir, rename, stat, open } from 'node:fs/promises';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';
import { debuglog, promisify } from 'node:util';

import { getFrameworkPath, importResolve } from '@eggjs/utils';
import { Args, Flags } from '@oclif/core';
import { homedir } from 'node-homedir';
import { readJSON, exists, getDateStringParts } from 'utility';

import { BaseCommand } from '../baseCommand.ts';

const debug = debuglog('egg/scripts/commands/start');

const execFile = promisify(_execFile);
const DEFAULT_BUNDLE_DIR = 'dist-bundle';

export interface FrameworkOptions {
  baseDir: string;
  framework?: string;
}

interface BundleWorkerOptions {
  appWorkerFile: string;
  agentWorkerFile: string;
  appSnapshotBlob?: string;
  agentSnapshotBlob?: string;
}

export default class Start<T extends typeof Start> extends BaseCommand<T> {
  static override description = 'Start server at prod mode';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --bundle',
    '<%= config.bin %> <%= command.id %> --bundle --app-snapshot-blob ./dist-bundle/app.snapshot.blob --agent-snapshot-blob ./dist-bundle/agent.snapshot.blob',
  ];

  static override args = {
    baseDir: Args.string({
      description: 'directory of application',
      required: false,
    }),
  };

  static override flags = {
    title: Flags.string({
      description: 'process title description, use for kill grep, default to `egg-server-${APP_NAME}`',
    }),
    framework: Flags.string({
      description: 'specify framework that can be absolute path or npm package',
    }),
    port: Flags.integer({
      description: 'listening port, default to `process.env.PORT`',
      char: 'p',
    }),
    workers: Flags.integer({
      char: 'c',
      aliases: ['cluster'],
      description: 'numbers of app workers, default to `process.env.EGG_WORKERS` or `os.cpus().length`',
    }),
    env: Flags.string({
      description: 'server env, default to `process.env.EGG_SERVER_ENV`',
      default: process.env.EGG_SERVER_ENV,
    }),
    daemon: Flags.boolean({
      description: 'whether run at background daemon mode',
    }),
    stdout: Flags.string({
      description: 'customize stdout file',
    }),
    stderr: Flags.string({
      description: 'customize stderr file',
    }),
    timeout: Flags.integer({
      description: 'the maximum timeout(ms) when app starts',
      default: 300 * 1000,
    }),
    'ignore-stderr': Flags.boolean({
      description: 'whether ignore stderr when app starts',
    }),
    node: Flags.string({
      description: 'customize node command path',
      default: 'node',
    }),
    'snapshot-blob': Flags.string({
      description:
        'boot one self-contained process from a V8 startup snapshot blob (built by `egg-bin snapshot build`)',
    }),
    bundle: Flags.boolean({
      description: 'boot the cluster from app and agent bundle entries',
      default: false,
    }),
    'bundle-dir': Flags.string({
      description: `bundle artifact directory (defaults to ./${DEFAULT_BUNDLE_DIR})`,
    }),
    'app-worker-file': Flags.string({
      description: 'app worker bundle entry (defaults to <bundle-dir>/app_worker.js)',
    }),
    'agent-worker-file': Flags.string({
      description: 'agent worker bundle entry (defaults to <bundle-dir>/agent_worker.js)',
    }),
    'app-snapshot-blob': Flags.string({
      description: 'optional V8 startup snapshot blob for app workers in bundle mode',
    }),
    'agent-snapshot-blob': Flags.string({
      description: 'optional V8 startup snapshot blob for the agent worker in bundle mode',
    }),
    require: Flags.string({
      summary: 'require the given module',
      char: 'r',
      multiple: true,
    }),
    sourcemap: Flags.boolean({
      summary: 'whether enable sourcemap support, will load `source-map-support` etc',
      aliases: ['ts', 'typescript'],
      // Allow the `--no-sourcemap` negation so callers can opt out of the
      // source-map-support `--import` that `egg.typescript` auto-enables (e.g. a
      // snapshot restore, where `--import` must not ride into `node --snapshot-blob`).
      allowNo: true,
    }),
  };

  isReady = false;
  #child: ChildProcess;

  protected async getFrameworkPath(options: FrameworkOptions): Promise<string> {
    return getFrameworkPath(options);
  }

  protected async getFrameworkName(frameworkPath: string): Promise<string> {
    const pkgPath = path.join(frameworkPath, 'package.json');
    let name = 'egg';
    try {
      const pkg = await readJSON(pkgPath);
      if (pkg.name) {
        name = pkg.name;
      }
    } catch {
      // ignore
    }
    return name;
  }

  protected async getServerBin(): Promise<string> {
    const serverBinName = this.isESM ? 'start-cluster.mjs' : 'start-cluster.cjs';
    return path.join(import.meta.dirname, '../../scripts', serverBinName);
  }

  /**
   * Resolve the major version of the node binary that will actually run the
   * snapshot. For the default (`--node` unset → 'node') or the egg-scripts
   * runtime itself, the spawned process shares this runtime's version; for an
   * explicit custom `--node /path`, query that binary directly. Returns
   * `undefined` when the version cannot be determined, so the gate fails open
   * (proceeds) rather than blocking a launch whose version it cannot read.
   */
  async #resolveSnapshotNodeMajor(command: string): Promise<number | undefined> {
    if (command === 'node' || command === process.execPath) {
      return parseInt(process.versions.node, 10);
    }
    try {
      const { stdout } = await execFile(command, ['--version']);
      const match = /^v?(\d+)\./.exec(stdout.toString().trim());
      return match ? Number(match[1]) : undefined;
    } catch {
      return undefined;
    }
  }

  #resolveFromBaseDir(filepath: string, baseDir: string): string {
    return path.isAbsolute(filepath) ? filepath : path.join(baseDir, filepath);
  }

  #resolveOptionalFromBaseDir(filepath: string | undefined, baseDir: string): string | undefined {
    return filepath ? this.#resolveFromBaseDir(filepath, baseDir) : undefined;
  }

  #resolveBundleWorkerOptions(baseDir: string): BundleWorkerOptions {
    const bundleDir = this.#resolveFromBaseDir(this.flags['bundle-dir'] ?? DEFAULT_BUNDLE_DIR, baseDir);
    const appWorkerFile =
      this.#resolveOptionalFromBaseDir(this.flags['app-worker-file'], baseDir) ?? path.join(bundleDir, 'app_worker.js');
    const agentWorkerFile =
      this.#resolveOptionalFromBaseDir(this.flags['agent-worker-file'], baseDir) ??
      path.join(bundleDir, 'agent_worker.js');
    const appSnapshotBlob = this.#resolveOptionalFromBaseDir(this.flags['app-snapshot-blob'], baseDir);
    const agentSnapshotBlob = this.#resolveOptionalFromBaseDir(this.flags['agent-snapshot-blob'], baseDir);

    const options: BundleWorkerOptions = {
      appWorkerFile,
      agentWorkerFile,
    };
    if (appSnapshotBlob !== undefined) {
      options.appSnapshotBlob = appSnapshotBlob;
    }
    if (agentSnapshotBlob !== undefined) {
      options.agentSnapshotBlob = agentSnapshotBlob;
    }
    return options;
  }

  public async run(): Promise<void> {
    const { args, flags } = this;
    // context.execArgvObj = context.execArgvObj || {};
    // const { argv, env, cwd, execArgvObj } = context;
    const HOME = homedir();
    const logDir = path.join(HOME, 'logs');

    // eggctl start
    // eggctl start ./server
    // eggctl start /opt/app
    const cwd = process.cwd();
    let baseDir = args.baseDir || cwd;
    if (!path.isAbsolute(baseDir)) {
      baseDir = path.join(cwd, baseDir);
    }
    await this.initBaseInfo(baseDir);

    // The shared startup option/env pipeline below runs for cluster, single
    // snapshot, and cluster snapshot launches; only the final argv/options differ.
    flags.title = flags.title || `egg-server-${this.pkg?.name ?? 'snapshot'}`;

    flags.stdout = flags.stdout || path.join(logDir, 'master-stdout.log');
    flags.stderr = flags.stderr || path.join(logDir, 'master-stderr.log');

    if (flags.workers === undefined && process.env.EGG_WORKERS) {
      flags.workers = Number(process.env.EGG_WORKERS);
    }

    // normalize env
    this.env.HOME = HOME;
    this.env.NODE_ENV = 'production';
    // disable ts file loader
    this.env.EGG_TS_ENABLE = 'false';

    // it makes env big but more robust
    this.env.PATH = this.env.Path = [
      // for nodeinstall
      path.join(baseDir, 'node_modules/.bin'),
      // support `.node/bin`, due to npm5 will remove `node_modules/.bin`
      path.join(baseDir, '.node/bin'),
      // adjust env for win
      this.env.PATH || this.env.Path,
    ]
      .filter((x) => !!x)
      .join(path.delimiter);

    // for alinode
    this.env.ENABLE_NODE_LOG = 'YES';
    this.env.NODE_LOG_DIR = this.env.NODE_LOG_DIR || path.join(logDir, 'alinode');
    await mkdir(this.env.NODE_LOG_DIR, { recursive: true });

    // cli argv -> process.env.EGG_SERVER_ENV -> `undefined` then egg will use `prod`
    if (flags.env) {
      // if undefined, should not pass key due to `spawn`, https://github.com/nodejs/node/blob/master/lib/child_process.js#L470
      this.env.EGG_SERVER_ENV = flags.env;
    }

    // additional execArgv
    const execArgv: string[] = ['--no-deprecation', '--trace-warnings'];
    if (this.pkgEgg.revert) {
      const reverts = Array.isArray(this.pkgEgg.revert) ? this.pkgEgg.revert : [this.pkgEgg.revert];
      for (const revert of reverts) {
        execArgv.push(`--security-revert=${revert}`);
      }
    }

    // pkg.eggScriptsConfig.require
    const scriptsConfig: Record<string, any> = this.pkg.eggScriptsConfig;
    if (scriptsConfig?.require) {
      scriptsConfig.require = Array.isArray(scriptsConfig.require) ? scriptsConfig.require : [scriptsConfig.require];
      flags.require = [...scriptsConfig.require, ...(flags.require ?? [])];
    }

    // read argv from eggScriptsConfig in package.json
    if (scriptsConfig) {
      for (const key in scriptsConfig) {
        const v = scriptsConfig[key];
        if (key.startsWith('node-options--')) {
          const newKey = key.replace('node-options--', '');
          if (v === true) {
            // "node-options--allow-wasi": true
            // => --allow-wasi
            execArgv.push(`--${newKey}`);
          } else {
            // "node-options--max-http-header-size": "20000"
            // => --max-http-header-size=20000
            execArgv.push(`--${newKey}=${v}`);
          }
          continue;
        }
        const existsValue = Reflect.get(flags, key);
        if (existsValue === undefined) {
          // only set if key is not pass from command line
          Reflect.set(flags, key, v);
        }
      }
    }

    // read `egg.typescript` from package.json
    if (this.pkgEgg.typescript && flags.sourcemap === undefined) {
      flags.sourcemap = true;
    }
    if (flags.sourcemap) {
      const sourceMapSupportPkgPath = importResolve('source-map-support/package.json', {
        paths: [import.meta.dirname],
      });
      const sourceMapSupport = path.join(path.dirname(sourceMapSupportPkgPath), 'register.js');
      if (this.isESM) {
        execArgv.push('--import', sourceMapSupport);
      } else {
        execArgv.push('--require', sourceMapSupport);
      }
    }

    if (flags.port === undefined && process.env.PORT) {
      flags.port = parseInt(process.env.PORT);
    }

    debug('flags: %o, baseDir: %o, execArgv: %o', flags, baseDir, execArgv);

    const command = flags.node;
    const options: SpawnOptions = {
      env: this.env,
      stdio: 'inherit',
      detached: false,
      cwd: baseDir,
    };

    // The final argv/options distinguish the original cluster, explicit bundle,
    // and single-process snapshot launch paths.
    let eggArgs: string[];
    let displayName: string;
    const clusterSnapshotRequested =
      flags.bundle && Boolean(flags['app-snapshot-blob'] || flags['agent-snapshot-blob']);
    const snapshotRequested = Boolean(flags['snapshot-blob'] || clusterSnapshotRequested);

    if (snapshotRequested) {
      // Restoring a V8 startup snapshot requires Node.js >= 24. A snapshot can be
      // built on Node.js >= 22, but restoring a non-trivial egg heap on Node.js 22
      // aborts during deserialization. Check the binary that will actually launch
      // either the restored process or the cluster master before spawning it.
      const nodeMajor = await this.#resolveSnapshotNodeMajor(command);
      if (nodeMajor !== undefined && nodeMajor < 24) {
        this.error(
          `egg-scripts start from a V8 snapshot requires Node.js >= 24, ` +
            `but ${command} is Node.js ${nodeMajor}.x. ` +
            `Building a snapshot (egg-bin snapshot build) works on Node.js >= 22, ` +
            `but restoring it must run on Node.js >= 24. Please upgrade Node.js to 24 or later.`,
          { exit: 1 },
        );
      }
    }

    if (flags['snapshot-blob']) {
      // Snapshot boot: a single self-contained `node --snapshot-blob <blob>`
      // process (no egg-cluster, no framework resolution). The snapshot entry
      // reads the listen port from PORT env, and `--title` is appended only so
      // `egg-scripts stop` can grep the process (the snapshot main ignores it).
      const blob = this.#resolveFromBaseDir(flags['snapshot-blob'], baseDir);
      if (flags.port !== undefined) {
        this.env.PORT = String(flags.port);
      }
      eggArgs = [...execArgv, '--snapshot-blob', blob, `--title=${flags.title}`];
      displayName = 'snapshot';
      this.log('Starting egg snapshot at %s', blob);
    } else {
      flags.framework = await this.getFrameworkPath({ framework: flags.framework, baseDir });
      const frameworkName = await this.getFrameworkName(flags.framework);
      const clusterWorkerOptions = flags.bundle ? this.#resolveBundleWorkerOptions(baseDir) : {};
      if (flags.bundle) {
        this.log('Starting %s application with bundled cluster workers', frameworkName);
        if ('appSnapshotBlob' in clusterWorkerOptions) {
          this.log('App workers restore from snapshot at %s', clusterWorkerOptions.appSnapshotBlob);
        }
        if ('agentSnapshotBlob' in clusterWorkerOptions) {
          this.log('Agent worker restores from snapshot at %s', clusterWorkerOptions.agentSnapshotBlob);
        }
      } else {
        this.log('Starting %s application at %s', frameworkName, baseDir);
      }
      // remove unused properties from stringify, alias had been remove by `removeAlias`
      const ignoreKeys = [
        'env',
        'daemon',
        'stdout',
        'stderr',
        'timeout',
        'ignore-stderr',
        'node',
        'snapshot-blob',
        'bundle',
        'bundle-dir',
        'app-worker-file',
        'agent-worker-file',
        'app-snapshot-blob',
        'agent-snapshot-blob',
      ];
      const clusterOptions = stringify({ ...flags, baseDir, ...clusterWorkerOptions }, ignoreKeys);
      // Note: `spawn` is not like `fork`, had to pass `execArgv` yourself
      const serverBin = await this.getServerBin();
      eggArgs = [...execArgv, serverBin, clusterOptions, `--title=${flags.title}`];
      displayName = frameworkName;
    }

    const spawnScript = `${command} ${eggArgs.map((a) => `'${a}'`).join(' ')}`;
    this.log('Spawn %o', spawnScript);

    await this.spawnServer(command, eggArgs, options, logDir, displayName);
  }

  /**
   * Shared spawn + daemon/foreground lifecycle for both the cluster and snapshot
   * launch paths. In daemon mode it waits for an `egg-ready` IPC message via
   * {@link checkStatus}; in foreground mode it forwards termination signals to the
   * child and mirrors its exit code.
   */
  protected async spawnServer(
    command: string,
    eggArgs: string[],
    options: SpawnOptions,
    logDir: string,
    displayName: string,
  ): Promise<void> {
    const { flags } = this;
    // whether run in the background.
    if (flags.daemon) {
      this.log(`Save log file to ${logDir}`);
      const [stdout, stderr] = await Promise.all([getRotateLog(flags.stdout!), getRotateLog(flags.stderr!)]);
      options.stdio = ['ignore', stdout, stderr, 'ipc'];
      options.detached = true;
      const child = (this.#child = spawn(command, eggArgs, options));
      this.isReady = false;
      child.on('message', (msg: any) => {
        // https://github.com/eggjs/cluster/blob/master/src/master.ts#L119
        if (msg && msg.action === 'egg-ready') {
          this.isReady = true;
          this.log('%s started on %s', displayName, msg.data.address);
          child.unref();
          child.disconnect();
        }
      });

      // check start status
      await this.checkStatus();
    } else {
      options.stdio = ['inherit', 'inherit', 'inherit', 'ipc'];
      const child = (this.#child = spawn(command, eggArgs, options));
      child.once('exit', (code) => {
        if (!code) return;
        // command should exit after child process exit
        this.exit(code);
      });

      // attach master signal to child
      const signals = ['SIGINT', 'SIGQUIT', 'SIGTERM'] as NodeJS.Signals[];
      signals.forEach((event) => {
        process.once(event, () => {
          debug('Kill child %s with %s', child.pid, event);
          child.kill(event);
        });
      });
    }
  }

  protected async checkStatus(): Promise<void> {
    let count = 0;
    let hasError = false;
    let isSuccess = true;
    const timeout = this.flags.timeout / 1000;
    const stderrFile = this.flags.stderr!;
    while (!this.isReady) {
      try {
        const stats = await stat(stderrFile);
        if (stats && stats.size > 0) {
          hasError = true;
          break;
        }
      } catch {
        // nothing
      }

      if (count >= timeout) {
        this.logToStderr('Start failed, %ds timeout', timeout);
        isSuccess = false;
        break;
      }

      await scheduler.wait(1000);
      this.log('Wait Start: %d...', ++count);
    }

    if (hasError) {
      try {
        const args = ['-n', '100', stderrFile];
        this.logToStderr('tail %s', args.join(' '));
        const { stdout: headStdout } = await execFile('head', args);
        const { stdout: tailStdout } = await execFile('tail', args);
        this.logToStderr('Got error when startup: ');
        this.logToStderr(headStdout);
        this.logToStderr('...');
        this.logToStderr(tailStdout);
      } catch (err) {
        this.logToStderr('ignore tail error: %s', err);
      }
      isSuccess = this.flags['ignore-stderr'];
      this.logToStderr('Start got error, see %o', stderrFile);
      this.logToStderr('Or use `--ignore-stderr` to ignore stderr at startup.');
    }

    if (!isSuccess) {
      this.#child.kill('SIGTERM');
      await scheduler.wait(1000);
      this.exit(1);
    }
  }
}

function stringify(obj: Record<string, any>, ignore: string[]) {
  const result: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (!ignore.includes(key)) {
      result[key] = obj[key];
    }
  });
  return JSON.stringify(result);
}

async function getRotateLog(logFile: string) {
  await mkdir(path.dirname(logFile), { recursive: true });

  if (await exists(logFile)) {
    // format style: .20150602.193100
    const [YYYY, MM, DD, HH, mm, ss] = getDateStringParts();
    const timestamp = `.${YYYY}${MM}${DD}.${HH}${mm}${ss}`;
    // Note: rename last log to next start time, not when last log file created
    await rename(logFile, logFile + timestamp);
  }

  return (await open(logFile, 'a')).fd;
}
