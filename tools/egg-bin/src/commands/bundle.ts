import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { debuglog } from 'node:util';

import { Flags } from '@oclif/core';

import { BaseCommand } from '../baseCommand.ts';
import { bundleModes, getBundleFrameworkSpecifier, getBundleMode, parsePackAliases } from '../bundleOptions.ts';
import { getSourceFilename } from '../utils.ts';

const debug = debuglog('egg/bin/commands/bundle');

export default class Bundle extends BaseCommand<typeof Bundle> {
  static override description =
    'Bundle an egg app (single-process by default, cluster with --cluster) or a standalone tegg app into a deployable artifact';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --output ./dist-bundle',
    '<%= config.bin %> <%= command.id %> --cluster --output ./dist-bundle',
    '<%= config.bin %> <%= command.id %> --framework egg --output ./out',
    '<%= config.bin %> <%= command.id %> --framework @eggjs/service-worker --entry worker.ts',
    '<%= config.bin %> <%= command.id %> --target standalone --framework @eggjs/service-worker --entry worker.ts --format service-worker',
  ];

  static override flags = {
    output: Flags.string({
      char: 'o',
      description: 'output directory (default: ./dist-bundle for an app, ./dist-worker for standalone)',
    }),
    framework: Flags.string({
      char: 'f',
      description: 'framework specifier (app); or the standalone app package that exports loadMetadata',
    }),
    mode: Flags.string({
      description: 'build mode',
      options: [...bundleModes],
      default: 'production',
    }),
    manifest: Flags.string({
      description: 'app: path to manifest.json (defaults to <baseDir>/.egg/manifest.json)',
    }),
    'force-external': Flags.string({
      description: 'app: package name to always mark as external (repeatable)',
      multiple: true,
      default: [],
    }),
    'inline-external': Flags.string({
      description: 'app: package name to force-inline even if auto-detected as external (repeatable)',
      multiple: true,
      default: [],
    }),
    'pack-alias': Flags.string({
      description: 'app: @utoo/pack resolve alias in <specifier>=<target> form',
      multiple: true,
      default: [],
    }),
    target: Flags.string({
      description: 'bundle target; standalone is inferred from --entry when omitted',
      options: ['app', 'standalone'],
    }),
    cluster: Flags.boolean({
      description: 'app: emit separate app_worker.js and agent_worker.js entries for egg-scripts start --bundle',
      default: false,
    }),
    entry: Flags.string({
      description: 'standalone: path to the worker entry (e.g. worker.ts), relative to --base',
    }),
    format: Flags.string({
      description: 'standalone: worker host format',
      options: ['module', 'service-worker'],
      default: 'module',
    }),
    'app-dir': Flags.string({
      description: 'standalone: the tegg module dir to scan, relative to --base',
      default: 'app',
    }),
    exclude: Flags.string({
      description: 'standalone: module name to drop from the manifest (repeatable)',
      multiple: true,
      default: [],
    }),
    root: Flags.string({
      description: 'standalone: monorepo root for node_modules resolution (defaults to --base)',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = this;
    const baseDir = flags.base;

    const isStandalone = flags.target === 'standalone' || (!flags.target && !!flags.entry);

    if (flags.cluster && isStandalone) {
      this.error('--cluster cannot be combined with --target standalone or --entry');
    }

    if (isStandalone) {
      await this.#runStandalone(baseDir);
    } else {
      await this.#runApp(baseDir);
    }
  }

  async #runApp(baseDir: string): Promise<void> {
    const { flags } = this;
    const output = flags.output ?? './dist-bundle';
    const outputDir = path.isAbsolute(output) ? output : path.join(baseDir, output);
    const manifestPath = flags.manifest
      ? path.isAbsolute(flags.manifest)
        ? flags.manifest
        : path.join(baseDir, flags.manifest)
      : undefined;

    debug(
      'bundle app: baseDir=%s, outputDir=%s, framework=%s, mode=%s',
      baseDir,
      outputDir,
      flags.framework,
      flags.mode,
    );

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
      ...(flags.cluster ? { target: 'cluster' as const } : {}),
      ...(packAlias ? { pack: { resolve: { alias: packAlias } } } : {}),
    });

    this.log(`bundled to ${result.outputDir} (${result.files.length} files)`);
    this.log(`manifest: ${result.manifestPath}`);
  }

  async #runStandalone(baseDir: string): Promise<void> {
    const { flags } = this;
    if (!flags.framework) {
      this.error('--target standalone requires --framework (the app package that exports loadMetadata)');
    }
    if (!flags.entry) {
      this.error('--target standalone requires --entry (the worker entry, e.g. worker.ts)');
    }
    const appDir = path.resolve(baseDir, flags['app-dir']);
    const entry = path.resolve(baseDir, flags.entry);
    const output = flags.output ?? './dist-worker';
    const outputDir = path.isAbsolute(output) ? output : path.join(baseDir, output);
    const rootPath = flags.root ? path.resolve(baseDir, flags.root) : baseDir;

    debug('bundle standalone: appDir=%s, entry=%s, format=%s, outputDir=%s', appDir, entry, flags.format, outputDir);

    const manifest = await this.#loadStandaloneMetadata(baseDir, appDir, flags.framework);
    const { StandaloneWorkerBundler } = await import('@eggjs/egg-bundler');
    const result = await new StandaloneWorkerBundler({
      baseDir: appDir,
      entry,
      format: flags.format as 'module' | 'service-worker',
      outputDir,
      manifest: manifest as never,
      excludeModules: flags.exclude,
      rootPath,
      mode: getBundleMode(flags.mode) as 'production' | 'development',
    }).run();

    this.log(`bundled ${flags.format} worker to ${result.outputDir}/${result.entry}`);
  }

  async #loadStandaloneMetadata(baseDir: string, appDir: string, framework: string): Promise<unknown> {
    // Run the scan where BaseCommand's TypeScript and import hooks are active.
    const temporaryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bin-standalone-metadata-'));
    const outputFile = path.join(temporaryDir, 'manifest.json');
    try {
      const script = getSourceFilename('../scripts/standalone-metadata.mjs');
      const args = [JSON.stringify({ baseDir, appDir, framework, outputFile })];
      const execArgv = await this.buildRequiresExecArgv();
      await this.forkNode(script, args, { execArgv });
      return JSON.parse(await fs.readFile(outputFile, 'utf8')) as unknown;
    } finally {
      await fs.rm(temporaryDir, { recursive: true, force: true });
    }
  }
}
