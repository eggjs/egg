import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { debuglog } from 'node:util';

import { Flags } from '@oclif/core';

import { BaseCommand } from '../baseCommand.ts';
import { bundleModes, getBundleFrameworkSpecifier, getBundleMode, parsePackAliases } from '../bundleOptions.ts';

const debug = debuglog('egg/bin/commands/bundle');

/** A framework/app package that exposes scan-only manifest generation (standalone target). */
interface StandaloneFramework {
  loadMetadata(cwd: string, options?: unknown): Promise<unknown>;
}

export default class Bundle extends BaseCommand<typeof Bundle> {
  static override description =
    'Bundle an egg app (default) or a standalone tegg app (--target standalone) into a deployable artifact';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --output ./dist-bundle',
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
    // app-only
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
    // standalone-only
    target: Flags.string({
      description: 'bundle target; auto-detected from --framework when omitted',
      options: ['app', 'standalone'],
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

    // `--entry` is standalone-only, so its presence selects the standalone target;
    // `--target` forces the choice. The standalone path validates that `--framework`
    // names a package exporting `loadMetadata`.
    const isStandalone = flags.target === 'standalone' || (!flags.target && !!flags.entry);

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
    const framework = await this.#importFramework(baseDir, flags.framework);
    if (!framework || typeof framework.loadMetadata !== 'function') {
      this.error(`--framework ${flags.framework} does not export loadMetadata; it is not a standalone bundle target`);
    }

    const appDir = path.resolve(baseDir, flags['app-dir']);
    const entry = path.resolve(baseDir, flags.entry);
    const output = flags.output ?? './dist-worker';
    const outputDir = path.isAbsolute(output) ? output : path.join(baseDir, output);
    const rootPath = flags.root ? path.resolve(baseDir, flags.root) : baseDir;

    debug('bundle standalone: appDir=%s, entry=%s, format=%s, outputDir=%s', appDir, entry, flags.format, outputDir);

    const { StandaloneWorkerBundler } = await import('@eggjs/egg-bundler');
    const manifest = await framework.loadMetadata(appDir);
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

  /** Import a framework/app package resolved from the app's baseDir, or undefined if unresolvable. */
  async #importFramework(baseDir: string, specifier: string): Promise<StandaloneFramework | undefined> {
    const require = createRequire(pathToFileURL(path.join(baseDir, 'package.json')));
    let resolved: string;
    try {
      resolved = require.resolve(specifier);
    } catch {
      return undefined;
    }
    return (await import(pathToFileURL(resolved).href)) as StandaloneFramework;
  }
}
