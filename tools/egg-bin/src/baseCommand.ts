import { debuglog } from 'node:util';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { fork, type ForkOptions, ChildProcess } from 'node:child_process';

import { Command, Flags, Interfaces } from '@oclif/core';
import { importResolve } from '@eggjs/utils';
import { runScript } from 'runscript';

import { getSourceDirname, readPackageJSON, hasTsConfig } from './utils.ts';
import { type PackageEgg } from './types.ts';

const debug = debuglog('egg-bin/baseCommand');

// only hook once and only when ever start any child.
const children = new Set<ChildProcess>();
let hadHook = false;
function graceful(proc: ChildProcess) {
  // save child ref
  children.add(proc);

  // only hook once
  /* c8 ignore else */
  if (!hadHook) {
    hadHook = true;
    let signal: NodeJS.Signals;
    ['SIGINT', 'SIGQUIT', 'SIGTERM'].forEach(event => {
      process.once(event, () => {
        signal = event as NodeJS.Signals;
        process.exit(0);
      });
    });

    process.once('exit', (code: number) => {
      for (const child of children) {
        debug(
          'process exit code: %o, kill child %o with %o',
          code,
          child.pid,
          signal
        );
        child.kill(signal);
      }
    });
  }
}

export class ForkError extends Error {
  code: number | null;
  constructor(message: string, code: number | null) {
    super(message);
    this.code = code;
  }
}

export interface ForkNodeOptions extends ForkOptions {
  dryRun?: boolean;
}

type CustomFlags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof BaseCommand)['baseFlags'] & T['flags']
>;
type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>;

export abstract class BaseCommand<T extends typeof Command> extends Command {
  // add the --json flag
  static enableJsonFlag = false;

  // define flags that can be inherited by any command that extends BaseCommand
  static baseFlags = {
    // 'log-level': Flags.option({
    //   default: 'info',
    //   helpGroup: 'GLOBAL',
    //   options: ['debug', 'warn', 'error', 'info', 'trace'] as const,
    //   summary: 'Specify level for logging.',
    // })(),
    'dry-run': Flags.boolean({
      default: false,
      helpGroup: 'GLOBAL',
      summary: 'whether show full command script only',
      char: 'd',
    }),
    require: Flags.string({
      helpGroup: 'GLOBAL',
      summary: 'require the given module',
      char: 'r',
      multiple: true,
    }),
    import: Flags.string({
      helpGroup: 'GLOBAL',
      summary: 'import the given module, only work on ESM',
      multiple: true,
    }),
    base: Flags.string({
      helpGroup: 'GLOBAL',
      summary: 'directory of application',
      aliases: ['baseDir'],
      default: process.cwd(),
    }),
    tscompiler: Flags.string({
      helpGroup: 'GLOBAL',
      summary: 'TypeScript compiler, like ts-node/register',
      aliases: ['tsc'],
    }),
    // flag with no value (--typescript)
    typescript: Flags.boolean({
      helpGroup: 'GLOBAL',
      description: '[default: true] use TypeScript to run the test',
      allowNo: true,
    }),
    ts: Flags.string({
      helpGroup: 'GLOBAL',
      description: 'shortcut for --typescript, e.g.: --ts=false',
      options: ['true', 'false'],
    }),
    javascript: Flags.boolean({
      helpGroup: 'GLOBAL',
      description: 'use JavaScript to run the test',
      aliases: ['js'],
    }),
    declarations: Flags.boolean({
      helpGroup: 'GLOBAL',
      description:
        'whether create typings, will add `--require egg-ts-helper/register`',
      aliases: ['dts'],
    }),
    // https://nodejs.org/dist/latest-v18.x/docs/api/cli.html#--inspect-brkhostport
    inspect: Flags.boolean({
      helpGroup: 'GLOBAL',
      description: 'Activate inspector',
    }),
    'inspect-brk': Flags.boolean({
      helpGroup: 'GLOBAL',
      description: 'Activate inspector and break at start of user script',
    }),
  };

  protected flags!: CustomFlags<T>;
  protected args!: Args<T>;

  protected env = { ...process.env };
  protected pkg: Record<string, any>;
  protected isESM: boolean;
  protected pkgEgg: PackageEgg;
  protected globalExecArgv: string[] = [];

  public async init(): Promise<void> {
    await super.init();
    debug('[init] raw args: %o, NODE_ENV: %o', this.argv, this.env.NODE_ENV);
    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });
    this.flags = flags as CustomFlags<T>;
    this.args = args as Args<T>;

    await this.#afterInit();
  }

  async #afterInit() {
    const { args, flags } = this;
    debug('before: args: %o, flags: %o', args, flags);
    if (!path.isAbsolute(flags.base)) {
      flags.base = path.join(process.cwd(), flags.base);
    }
    const pkg = await readPackageJSON(flags.base);
    this.pkg = pkg;
    this.pkgEgg = pkg.egg ?? {};
    flags.tscompiler =
      flags.tscompiler ?? this.env.TS_COMPILER ?? this.pkgEgg.tscompiler;

    let typescript: boolean = flags.typescript;
    // keep compatible with old ts flag: `--ts=true` or `--ts=false`
    if (flags.ts === 'true') {
      typescript = true;
    } else if (flags.ts === 'false') {
      typescript = false;
    }

    if (typescript === undefined) {
      // try to ready EGG_TYPESCRIPT env first, only accept 'true' or 'false' string
      if (this.env.EGG_TYPESCRIPT === 'false') {
        typescript = false;
        debug(
          'detect typescript=%o from EGG_TYPESCRIPT=%o',
          false,
          this.env.EGG_TYPESCRIPT
        );
      } else if (this.env.EGG_TYPESCRIPT === 'true') {
        typescript = true;
        debug(
          'detect typescript=%o from EGG_TYPESCRIPT=%o',
          true,
          this.env.EGG_TYPESCRIPT
        );
      } else if (typeof this.pkgEgg.typescript === 'boolean') {
        // read `egg.typescript` from package.json if not pass argv
        typescript = this.pkgEgg.typescript;
        debug(
          'detect typescript=%o from pkg.egg.typescript=%o',
          typescript,
          this.pkgEgg.typescript
        );
      } else if (pkg.dependencies?.typescript) {
        // auto detect pkg.dependencies.typescript or pkg.devDependencies.typescript
        typescript = true;
        debug(
          'detect typescript=%o from pkg.dependencies.typescript=%o',
          true,
          pkg.dependencies.typescript
        );
      } else if (pkg.devDependencies?.typescript) {
        typescript = true;
        debug(
          'detect typescript=%o from pkg.devDependencies.typescript=%o',
          true,
          pkg.devDependencies.typescript
        );
      } else if (await hasTsConfig(flags.base)) {
        // tsconfig.json exists
        typescript = true;
        debug('detect typescript=%o cause tsconfig.json exists', true);
      } else if (flags.tscompiler) {
        typescript = true;
        debug(
          'detect typescript=%o from --tscompiler=%o',
          true,
          flags.tscompiler
        );
      }
    }
    flags.typescript = typescript;
    let rootDir = path.dirname(getSourceDirname());
    if (path.basename(rootDir) === 'dist') {
      rootDir = path.dirname(rootDir);
    }
    // try app baseDir first on custom tscompiler
    // then try to find tscompiler in @eggjs/bin/node_modules
    const findPaths: string[] = [flags.base, rootDir];
    this.isESM = pkg.type === 'module';
    if (typescript) {
      flags.tscompiler = flags.tscompiler ?? 'ts-node/register';
      const tsNodeRegister = importResolve(flags.tscompiler, {
        paths: findPaths,
      });
      flags.tscompiler = tsNodeRegister;
      // should require tsNodeRegister on current process, let it can require *.ts files
      // e.g.: dev command will execute egg loader to find configs and plugins
      // await importModule(tsNodeRegister);
      // let child process auto require ts-node too
      this.addNodeOptions(this.formatImportModule(tsNodeRegister));
      // tell egg loader to load ts file
      // see https://github.com/eggjs/egg-core/blob/master/lib/loader/egg_loader.js#L443
      this.env.EGG_TYPESCRIPT = 'true';
      // set current process.env.EGG_TYPESCRIPT too
      process.env.EGG_TYPESCRIPT = 'true';
      // load files from tsconfig on startup
      this.env.TS_NODE_FILES = process.env.TS_NODE_FILES ?? 'true';
      // keep same logic with egg-core, test cmd load files need it
      // see https://github.com/eggjs/egg-core/blob/master/lib/loader/egg_loader.js#L49
      const tsConfigPathsRegister = importResolve('tsconfig-paths/register', {
        paths: findPaths,
      });
      this.addNodeOptions(this.formatImportModule(tsConfigPathsRegister));
    }
    if (this.isESM) {
      // use ts-node/esm loader on esm
      let esmLoader = importResolve('ts-node/esm', {
        paths: findPaths,
      });
      // ES Module loading with absolute path fails on windows
      // https://github.com/nodejs/node/issues/31710#issuecomment-583916239
      // https://nodejs.org/api/url.html#url_url_pathtofileurl_path
      // Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'd:'
      esmLoader = pathToFileURL(esmLoader).href;
      // wait for https://github.com/nodejs/node/issues/40940
      this.addNodeOptions('--no-warnings');
      this.addNodeOptions(`--loader ${esmLoader}`);
    }

    if (flags.declarations === undefined) {
      if (typeof this.pkgEgg.declarations === 'boolean') {
        // read `egg.declarations` from package.json if not pass argv
        flags.declarations = this.pkgEgg.declarations;
        debug(
          'detect declarations from pkg.egg.declarations=%o',
          this.pkgEgg.declarations
        );
      }
    }
    if (flags.declarations) {
      const etsBin = importResolve('egg-ts-helper/dist/bin', {
        paths: findPaths,
      });
      debug('run ets first: %o', etsBin);
      await runScript(`node "${etsBin}"`);
    }

    if (this.pkgEgg.revert) {
      const reverts = Array.isArray(this.pkgEgg.revert)
        ? this.pkgEgg.revert
        : [this.pkgEgg.revert];
      for (const revert of reverts) {
        this.globalExecArgv.push(`--security-revert=${revert}`);
      }
    }

    let hasInspectOption = false;
    if (flags.inspect) {
      this.addNodeOptions('--inspect');
      hasInspectOption = true;
    }
    if (flags['inspect-brk']) {
      this.addNodeOptions('--inspect-brk');
      hasInspectOption = true;
    }
    if (hasInspectOption) {
      Reflect.set(flags, 'timeout', 0);
      debug('set timeout = 0 when inspect enable');
    } else if (this.env.JB_DEBUG_FILE) {
      // others like WebStorm 2019 will pass NODE_OPTIONS, and @eggjs/bin itself will be debug, so could detect `process.env.JB_DEBUG_FILE`.
      Reflect.set(flags, 'timeout', 0);
      debug(
        'set timeout = false when process.env.JB_DEBUG_FILE=%o',
        this.env.JB_DEBUG_FILE
      );
    }

    debug('baseDir: %o, isESM: %o', flags.base, this.isESM);
    debug('set NODE_OPTIONS: %o', this.env.NODE_OPTIONS);
    debug('after: args: %o, flags: %o', args, flags);
    debug('enter real command: %o', this.id);
  }

  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err);
  }

  protected async finally(_: Error | undefined): Promise<any> {
    // called after run and catch regardless of whether or not the command errored
    return super.finally(_);
  }

  protected async formatRequires(): Promise<string[]> {
    const requires = this.flags.require ?? [];
    const imports = this.flags.import ?? [];
    let eggRequires = (this.pkgEgg.require as string[]) ?? [];
    if (typeof eggRequires === 'string') {
      eggRequires = [eggRequires];
    }
    let eggImports = (this.pkgEgg.import as string[]) ?? [];
    if (typeof eggImports === 'string') {
      eggImports = [eggImports];
    }
    return [...requires, ...imports, ...eggRequires, ...eggImports];
  }

  protected formatImportModule(modulePath: string) {
    if (this.isESM) {
      return `--import "${pathToFileURL(modulePath).href}"`;
    }
    if (os.platform() === 'win32') {
      // windows path need to escape backslash: `node --require "C:\\path\\to\\module"`
      return `--require "${path.win32.normalize(modulePath).replace(/\\/g, '\\\\')}"`;
    }
    return `--require "${modulePath}"`;
  }

  protected addNodeOptions(options: string) {
    if (this.env.NODE_OPTIONS) {
      if (!this.env.NODE_OPTIONS.includes(options)) {
        this.env.NODE_OPTIONS = `${this.env.NODE_OPTIONS} ${options}`;
      }
    } else {
      this.env.NODE_OPTIONS = options;
    }
  }

  protected async forkNode(
    modulePath: string,
    forkArgs: string[],
    options: ForkNodeOptions = {}
  ) {
    const env = {
      ...this.env,
      ...options.env,
    };
    const forkExecArgv = [...this.globalExecArgv, ...(options.execArgv || [])];
    const NODE_OPTIONS = env.NODE_OPTIONS
      ? `NODE_OPTIONS='${env.NODE_OPTIONS}' `
      : '';
    const forkExecArgvString = forkExecArgv.length
      ? ' ' + forkExecArgv.join(' ') + ' '
      : ' ';
    const forkArgsString = forkArgs.map(a => `'${a}'`).join(' ');
    const fullCommand = `${NODE_OPTIONS}${process.execPath}${forkExecArgvString}${modulePath} ${forkArgsString}`;
    if (options.dryRun) {
      console.log('dry run: $ %s', fullCommand);
      return;
    }

    options = {
      stdio: 'inherit',
      env,
      cwd: this.flags.base,
      ...options,
      execArgv: forkExecArgv,
    };
    const proc = fork(modulePath, forkArgs, options);
    debug('Run fork pid: %o\n\n$ %s\n\n', proc.pid, fullCommand);
    graceful(proc);

    return new Promise<void>((resolve, reject) => {
      proc.once('exit', code => {
        debug('fork pid: %o exit code %o', proc.pid, code);
        children.delete(proc);
        if (code !== 0) {
          const err = new ForkError(
            modulePath + ' ' + forkArgs.join(' ') + ' exit with code ' + code,
            code
          );
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
