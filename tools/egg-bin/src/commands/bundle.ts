import path from 'node:path';
import { debuglog } from 'node:util';

import { Flags } from '@oclif/core';

import { BaseCommand } from '../baseCommand.ts';

const debug = debuglog('egg/bin/commands/bundle');
const bundleModes = ['production', 'development'] as const;
type BundleMode = (typeof bundleModes)[number];

function getBundleMode(mode: string): BundleMode {
  if (mode === 'production' || mode === 'development') {
    return mode;
  }
  throw new Error(`Unsupported bundle mode: ${mode}`);
}

function parsePackAliases(values: readonly string[], baseDir: string): Record<string, string> | undefined {
  if (values.length === 0) return undefined;

  const alias: Record<string, string> = {};
  for (const value of values) {
    const separator = value.indexOf('=');
    if (separator <= 0 || separator === value.length - 1) {
      throw new Error(`Invalid --pack-alias value: ${value}. Expected <specifier>=<target>.`);
    }

    const specifier = value.slice(0, separator);
    const target = value.slice(separator + 1);
    alias[specifier] = target.startsWith('.') ? path.resolve(baseDir, target) : target;
  }

  return alias;
}

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
    'no-tegg': Flags.boolean({
      description: 'disable tegg decoratedFile collection',
      default: false,
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

    debug(
      'bundle: baseDir=%s, outputDir=%s, framework=%s, mode=%s, tegg=%s',
      baseDir,
      outputDir,
      flags.framework,
      flags.mode,
      !flags['no-tegg'],
    );

    const { bundle } = await import('@eggjs/egg-bundler');
    const packAlias = parsePackAliases(flags['pack-alias'], baseDir);
    const result = await bundle({
      baseDir,
      outputDir,
      manifestPath,
      framework: flags.framework ?? 'egg',
      mode: getBundleMode(flags.mode),
      tegg: !flags['no-tegg'],
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
