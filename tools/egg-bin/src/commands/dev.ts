import { debuglog } from 'node:util';

import { getFrameworkPath } from '@eggjs/utils';
import { Flags } from '@oclif/core';
import { detect } from 'detect-port';

import { BaseCommand } from '../baseCommand.ts';
import { getSourceFilename } from '../utils.ts';

const debug = debuglog('egg/bin/commands/dev');

export default class Dev<T extends typeof Dev> extends BaseCommand<T> {
  static override description = 'Start server at local dev mode';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  static override flags = {
    port: Flags.integer({
      description: 'listening port, default to 7001',
      char: 'p',
    }),
    workers: Flags.integer({
      char: 'c',
      aliases: ['cluster'],
      description: 'numbers of app workers',
      default: 1,
    }),
    framework: Flags.string({
      description: 'specify framework that can be absolute path or npm package, default is "egg"',
    }),
    sticky: Flags.boolean({
      description: 'start a sticky cluster server',
    }),
  };

  public async run(): Promise<void> {
    this.env.NODE_ENV = this.env.NODE_ENV ?? 'development';
    debug('NODE_ENV: %o', this.env.NODE_ENV);
    this.env.EGG_MASTER_CLOSE_TIMEOUT = '1000';
    const ext = this.isESM ? 'mjs' : 'cjs';
    const serverBin = getSourceFilename(`../scripts/start-cluster.${ext}`);
    const eggStartOptions = await this.formatEggStartOptions();
    const args = [JSON.stringify(eggStartOptions)];
    const execArgv = await this.buildRequiresExecArgv();
    await this.forkNode(serverBin, args, { execArgv });
  }

  protected async formatEggStartOptions(): Promise<{
    baseDir: string;
    workers: number;
    port: number;
    framework: string;
    typescript: boolean;
    tscompiler: string | undefined;
    sticky: boolean | undefined;
  }> {
    const { flags } = this;
    flags.framework = getFrameworkPath({
      framework: flags.framework,
      baseDir: flags.base,
    });

    if (!flags.port) {
      const defaultPort = parseInt(process.env.EGG_BIN_DEFAULT_PORT ?? '7001');
      debug('detect available port');
      flags.port = await detect(defaultPort);
      if (flags.port !== defaultPort) {
        console.warn('[@eggjs/bin] server port %o is unavailable, now using port %o', defaultPort, flags.port);
      }
      debug(`use available port ${flags.port}`);
    }

    return {
      baseDir: flags.base,
      workers: flags.workers,
      port: flags.port,
      framework: flags.framework,
      typescript: flags.typescript,
      tscompiler: flags.tscompiler,
      sticky: flags.sticky,
    };
  }
}
