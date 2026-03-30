import { debuglog } from 'node:util';

import { getFrameworkPath } from '@eggjs/utils';
import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../baseCommand.ts';
import { getSourceFilename } from '../utils.ts';

const debug = debuglog('egg/bin/commands/manifest');

export default class Manifest<T extends typeof Manifest> extends BaseCommand<T> {
  static override description = 'Manage the startup manifest for faster cold starts';

  static override examples = [
    '<%= config.bin %> <%= command.id %> generate',
    '<%= config.bin %> <%= command.id %> generate --env=prod',
    '<%= config.bin %> <%= command.id %> validate --env=prod',
    '<%= config.bin %> <%= command.id %> clean',
  ];

  static override args = {
    action: Args.string({
      required: true,
      description: 'Action to perform',
      options: ['generate', 'validate', 'clean'],
    }),
  };

  static override flags = {
    framework: Flags.string({
      description: 'specify framework that can be absolute path or npm package',
    }),
    env: Flags.string({
      description: 'server environment for manifest generation/validation',
      default: 'prod',
    }),
    scope: Flags.string({
      description: 'server scope for manifest validation',
      default: '',
    }),
  };

  public async run(): Promise<void> {
    const { action } = this.args;
    switch (action) {
      case 'generate':
        await this.runGenerate();
        break;
      case 'validate':
        await this.runValidate();
        break;
      case 'clean':
        await this.runClean();
        break;
    }
  }

  private async runGenerate(): Promise<void> {
    const { flags } = this;
    const framework = getFrameworkPath({
      framework: flags.framework,
      baseDir: flags.base,
    });
    debug(
      'generate manifest: baseDir=%s, framework=%s, env=%s, scope=%s',
      flags.base,
      framework,
      flags.env,
      flags.scope,
    );

    const options = {
      baseDir: flags.base,
      framework,
      env: flags.env,
      scope: flags.scope,
    };

    const serverBin = getSourceFilename('../scripts/manifest-generate.mjs');
    const args = [JSON.stringify(options)];
    const execArgv = await this.buildRequiresExecArgv();
    await this.forkNode(serverBin, args, { execArgv });
  }

  private async runValidate(): Promise<void> {
    const { flags } = this;
    debug('validate manifest: baseDir=%s, env=%s, scope=%s', flags.base, flags.env, flags.scope);

    // Bypass the local-env guard since the user explicitly asked to validate
    const savedEggManifest = process.env.EGG_MANIFEST;
    process.env.EGG_MANIFEST = 'true';

    try {
      const { ManifestStore } = await import('@eggjs/core');
      const store = ManifestStore.load(flags.base, flags.env, flags.scope);

      if (!store) {
        console.error('[manifest] Manifest is invalid or does not exist');
        return this.exit(1);
      }

      const { data } = store;
      const resolveCacheCount = Object.keys(data.resolveCache ?? {}).length;
      const fileDiscoveryCount = Object.keys(data.fileDiscovery ?? {}).length;
      const extensionCount = Object.keys(data.extensions ?? {}).length;
      console.log('[manifest] Manifest is valid');
      console.log('[manifest]   version: %d', data.version);
      console.log('[manifest]   generatedAt: %s', data.generatedAt);
      console.log('[manifest]   serverEnv: %s', data.invalidation.serverEnv);
      console.log('[manifest]   serverScope: %s', data.invalidation.serverScope);
      console.log('[manifest]   resolveCache entries: %d', resolveCacheCount);
      console.log('[manifest]   fileDiscovery entries: %d', fileDiscoveryCount);
      console.log('[manifest]   extension entries: %d', extensionCount);
    } finally {
      // Restore original env
      if (savedEggManifest === undefined) {
        delete process.env.EGG_MANIFEST;
      } else {
        process.env.EGG_MANIFEST = savedEggManifest;
      }
    }
  }

  private async runClean(): Promise<void> {
    const { flags } = this;
    debug('clean manifest: baseDir=%s', flags.base);

    const { ManifestStore } = await import('@eggjs/core');
    ManifestStore.clean(flags.base);
    console.log('[manifest] Manifest cleaned');
  }
}
