import { debuglog } from 'node:util';
import { Command, Interfaces } from '@oclif/core';
import type { PackageEgg } from './types.ts';
import { readJSON } from 'utility';
import path from 'node:path';

const debug = debuglog('@eggjs/scripts/baseCommand');

type Flags<T extends typeof Command> = Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & T['flags']>;
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
  };

  protected flags!: Flags<T>;
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
    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;
  }

  protected async initBaseInfo(baseDir: string) {
    const pkg = await readJSON(path.join(baseDir, 'package.json'));
    this.pkg = pkg;
    this.pkgEgg = pkg.egg ?? {};
    this.isESM = pkg.type === 'module';
    debug('[initBaseInfo] baseDir: %o, pkgEgg: %o, isESM: %o', baseDir, this.pkgEgg, this.isESM);
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
}
