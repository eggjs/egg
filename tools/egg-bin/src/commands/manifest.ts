import fs from 'node:fs';
import path from 'node:path';
import { debuglog } from 'node:util';

import { ManifestStore } from '@eggjs/core';
import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../baseCommand.ts';

const debug = debuglog('egg/bin/commands/manifest');

export default class Manifest<T extends typeof Manifest> extends BaseCommand<T> {
  static override description = 'Generate, validate, or clean the startup manifest for faster cold starts';

  static override examples = [
    '<%= config.bin %> <%= command.id %> generate',
    '<%= config.bin %> <%= command.id %> validate',
    '<%= config.bin %> <%= command.id %> clean',
  ];

  static override flags = {
    framework: Flags.string({
      description: 'specify framework, default is "egg"',
    }),
    env: Flags.string({
      description: 'server environment, default is "prod"',
      default: 'prod',
    }),
  };

  static override args = {
    action: Args.string({
      description: 'action to perform: generate, validate, or clean',
      required: true,
      options: ['generate', 'validate', 'clean'],
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Manifest);
    const baseDir = path.resolve(flags.base ?? process.cwd());
    const action = args.action as 'generate' | 'validate' | 'clean';

    debug('manifest %s, baseDir: %s', action, baseDir);

    switch (action) {
      case 'generate':
        await this.generate(baseDir, flags);
        break;
      case 'validate':
        this.validate(baseDir, flags);
        break;
      case 'clean':
        ManifestStore.clean(baseDir);
        this.log('Manifest cleaned at: %s', baseDir);
        break;
    }
  }

  private async generate(baseDir: string, flags: Record<string, any>): Promise<void> {
    this.log('Generating startup manifest...');
    this.log('  baseDir: %s', baseDir);

    const env = flags.env ?? 'prod';
    const manifest = ManifestStore.generate({
      baseDir,
      serverEnv: env,
      serverScope: '',
      typescriptEnabled: true,
      resolveCache: {},
      fileDiscovery: {},
    });

    await ManifestStore.write(baseDir, manifest);
    this.log('Manifest generated at: %s', path.join(baseDir, '.egg', 'manifest.json'));
    this.log('Note: For full manifest data, start the app once with EGG_SERVER_ENV=%s', env);
    this.log('The app will auto-generate a complete manifest on first startup.');
  }

  private validate(baseDir: string, flags: Record<string, any>): void {
    const manifestPath = path.join(baseDir, '.egg', 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      this.log('No manifest found at: %s', manifestPath);
      this.exit(1);
    }

    const env = flags.env ?? 'prod';
    const store = ManifestStore.load(baseDir, env, '');
    if (store) {
      this.log('Manifest is valid');
      this.log('  version: %d', store.data.version);
      this.log('  generated: %s', store.data.generatedAt);
      this.log('  env: %s', store.data.invalidation.serverEnv);
      this.log('  resolveCache entries: %d', Object.keys(store.data.resolveCache).length);
      this.log('  fileDiscovery entries: %d', Object.keys(store.data.fileDiscovery).length);
      if (store.data.tegg) {
        this.log('  tegg moduleReferences: %d', store.data.tegg.moduleReferences.length);
        this.log('  tegg moduleDescriptors: %d', store.data.tegg.moduleDescriptors.length);
      }
    } else {
      this.log('Manifest is invalid or outdated');
      this.exit(1);
    }
  }
}
