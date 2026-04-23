import path from 'node:path';
import { debuglog } from 'node:util';

import { Flags } from '@oclif/core';

import { BaseCommand } from '../baseCommand.ts';

const debug = debuglog('egg/bin/commands/bundle');

export default class Bundle<T extends typeof Bundle> extends BaseCommand<T> {
  static override description = 'Bundle an egg app into a deployable artifact using @eggjs/egg-bundler';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --output ./dist-bundle',
    '<%= config.bin %> <%= command.id %> --mode development',
    '<%= config.bin %> <%= command.id %> --framework egg --output ./out',
  ];

  static override flags = {
    output: Flags.string({
      char: 'o',
      description: 'output directory for the bundled artifact',
      default: './dist-bundle',
    }),
    manifest: Flags.string({
      description: 'path to manifest.json (defaults to <baseDir>/.egg/manifest.json)',
    }),
    framework: Flags.string({
      char: 'f',
      description: 'framework name or absolute path',
      default: 'egg',
    }),
    mode: Flags.string({
      description: 'build mode',
      options: ['production', 'development'],
      default: 'production',
    }),
    'no-tegg': Flags.boolean({
      description: 'disable tegg decoratedFile collection',
      default: false,
    }),
    'force-external': Flags.string({
      description: 'package name to always mark as external (repeatable)',
      multiple: true,
    }),
    'inline-external': Flags.string({
      description: 'package name to force-inline even if auto-detected as external (repeatable)',
      multiple: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = this;
    const baseDir = flags.base;
    const outputDir = path.isAbsolute(flags.output) ? flags.output : path.join(baseDir, flags.output);
    const manifestPath = flags.manifest
      ? path.isAbsolute(flags.manifest)
        ? flags.manifest
        : path.join(baseDir, flags.manifest)
      : undefined;

    debug(
      'bundle: baseDir=%s, outputDir=%s, framework=%s, mode=%s, tegg=%s',
      baseDir,
      outputDir,
      flags.framework,
      flags.mode,
      !flags['no-tegg'],
    );

    const { bundle } = await import('@eggjs/egg-bundler');
    const result = await bundle({
      baseDir,
      outputDir,
      manifestPath,
      framework: flags.framework,
      mode: flags.mode as 'production' | 'development',
      tegg: !flags['no-tegg'],
      externals: {
        force: flags['force-external'],
        inline: flags['inline-external'],
      },
    });

    this.log(`bundled to ${result.outputDir} (${result.files.length} files)`);
    this.log(`manifest: ${result.manifestPath}`);
  }
}
