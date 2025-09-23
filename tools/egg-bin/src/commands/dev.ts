import { debuglog } from 'node:util';

import { Flags } from '@oclif/core';
import { getConfig, getFrameworkPath } from '@eggjs/utils';
import { detect } from 'detect-port';

import { getSourceFilename } from '../utils.ts';
import { BaseCommand } from '../baseCommand.ts';

const debug = debuglog('egg-bin/commands/dev');

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
    debug('NODE_ENV: %o', this.env);
    this.env.NODE_ENV = this.env.NODE_ENV ?? 'development';
    this.env.EGG_MASTER_CLOSE_TIMEOUT = '1000';
    const ext = this.isESM ? 'mjs' : 'cjs';
    const serverBin = getSourceFilename(`../scripts/start-cluster.${ext}`);
    const eggStartOptions = await this.formatEggStartOptions();
    const args = [JSON.stringify(eggStartOptions)];
    const requires = await this.formatRequires();
    const execArgv: string[] = [];
    for (const r of requires) {
      const module = this.formatImportModule(r);

      // Remove the quotes from the path
      // --require "module path" -> ['--require', 'module path']
      // --import "module path" -> ['--import', 'module path']
      const splitIndex = module.indexOf(' ');
      if (splitIndex !== -1) {
        execArgv.push(module.slice(0, splitIndex), module.slice(splitIndex + 2, -1));
      }
    }
    await this.forkNode(serverBin, args, { execArgv });
  }

  protected async formatEggStartOptions() {
    const { flags } = this;
    flags.framework = getFrameworkPath({
      framework: flags.framework,
      baseDir: flags.base,
    });

    if (!flags.port) {
      let configuredPort: number | undefined;
      try {
        const configuration = await getConfig({
          framework: flags.framework,
          baseDir: flags.base,
          env: 'local',
        });
        configuredPort = configuration?.cluster?.listen?.port;
      } catch (err) {
        /** skip when failing to read the configuration */
        debug('getConfig error: %s, framework: %o, baseDir: %o, env: local', err, flags.framework, flags.base);
      }
      if (configuredPort) {
        flags.port = configuredPort;
        debug(`use port ${flags.port} from configuration file`);
      } else {
        const defaultPort = parseInt(process.env.EGG_BIN_DEFAULT_PORT ?? '7001');
        debug('detect available port');
        flags.port = await detect(defaultPort);
        if (flags.port !== defaultPort) {
          console.warn('[@eggjs/bin] server port %o is unavailable, now using port %o', defaultPort, flags.port);
        }
        debug(`use available port ${flags.port}`);
      }
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
