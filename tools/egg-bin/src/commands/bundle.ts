import path from 'node:path';
import { debuglog } from 'node:util';

import { Flags } from '@oclif/core';

import { BaseCommand } from '../baseCommand.ts';
import { bundleModes, getBundleFrameworkSpecifier, getBundleMode, parsePackAliases } from '../bundleOptions.ts';

const debug = debuglog('egg/bin/commands/bundle');

export default class Bundle extends BaseCommand<typeof Bundle> {
  static override description = 'Bundle an egg app into a deployable artifact using @eggjs/egg-bundler';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --output ./dist-bundle',
    '<%= config.bin %> <%= command.id %> --mode development',
    '<%= config.bin %> <%= command.id %> --framework egg --output ./out',
    '<%= config.bin %> <%= command.id %> --pack-alias some-package=./node_modules/some-package/index.js',
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
      description: 'framework package specifier',
    }),
    mode: Flags.string({
      description: 'build mode',
      options: [...bundleModes],
      default: 'production',
    }),
    'force-external': Flags.string({
      description: 'package name to always mark as external (repeatable)',
      multiple: true,
      default: [],
    }),
    'inline-external': Flags.string({
      description: 'package name to force-inline even if auto-detected as external (repeatable)',
      multiple: true,
      default: [],
    }),
    'pack-alias': Flags.string({
      description: '@utoo/pack resolve alias in <specifier>=<target> form, dot-relative targets resolve from --base',
      multiple: true,
      default: [],
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

    debug('bundle: baseDir=%s, outputDir=%s, framework=%s, mode=%s', baseDir, outputDir, flags.framework, flags.mode);

    const { bundle } = await import('@eggjs/egg-bundler');
    const packAlias = parsePackAliases(flags['pack-alias'], baseDir);
    const result = await bundle({
      baseDir,
      outputDir,
      manifestPath,
      framework: await getBundleFrameworkSpecifier(baseDir, flags.framework),
      mode: getBundleMode(flags.mode),
      externals: {
        force: flags['force-external'],
        inline: flags['inline-external'],
      },
      ...(packAlias ? { pack: { resolve: { alias: packAlias } } } : {}),
    });

    this.log(`bundled to ${result.outputDir} (${result.files.length} files)`);
    this.log(`manifest: ${result.manifestPath}`);
  }
}
