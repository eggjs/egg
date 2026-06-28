import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { debuglog } from 'node:util';

import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../baseCommand.ts';
import { bundleModes, getBundleFrameworkSpecifier, getBundleMode, parsePackAliases } from '../bundleOptions.ts';

const debug = debuglog('egg/bin/commands/snapshot');

/**
 * Build a V8 startup snapshot of a bundled egg app.
 *
 * `snapshot build` bundles the app in snapshot mode (single self-contained
 * worker.js plus prelude) and then wraps
 * `node --snapshot-blob <blob> --build-snapshot worker.js` to produce the blob.
 *
 * Booting from the blob is a production-runtime concern and lives in
 * `@eggjs/scripts`: `egg-scripts start --snapshot-blob <blob>`.
 */
export default class Snapshot<T extends typeof Snapshot> extends BaseCommand<T> {
  static override description = 'Build a V8 startup snapshot of a bundled egg app';

  static override examples = [
    '<%= config.bin %> <%= command.id %> build',
    '<%= config.bin %> <%= command.id %> build --output ./dist-bundle --blob ./dist-bundle/snapshot.blob',
    '<%= config.bin %> <%= command.id %> build --skip-bundle',
  ];

  static override args = {
    action: Args.string({
      required: true,
      description: 'Action to perform',
      options: ['build'],
    }),
  };

  static override flags = {
    output: Flags.string({
      char: 'o',
      description: 'bundle output directory (also where worker.js lives)',
      default: './dist-bundle',
    }),
    blob: Flags.string({
      description: 'snapshot blob path (defaults to <output>/snapshot.blob)',
    }),
    framework: Flags.string({
      char: 'f',
      description: 'framework package specifier (build only)',
    }),
    mode: Flags.string({
      description: 'bundle build mode (build only)',
      options: [...bundleModes],
      default: 'production',
    }),
    'force-external': Flags.string({
      description: 'package name to always mark as external, repeatable (build only)',
      multiple: true,
      default: [],
    }),
    'inline-external': Flags.string({
      description: 'package name to force-inline even if auto-detected as external, repeatable (build only)',
      multiple: true,
      default: [],
    }),
    'pack-alias': Flags.string({
      description: '@utoo/pack resolve alias in <specifier>=<target> form (build only)',
      multiple: true,
      default: [],
    }),
    'skip-bundle': Flags.boolean({
      description: 'skip bundling and build the snapshot from an existing worker.js (build only)',
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { action } = this.args;
    switch (action) {
      case 'build':
        await this.runBuild();
        break;
    }
  }

  #resolveOutputDir(): string {
    const { flags } = this;
    return path.isAbsolute(flags.output) ? flags.output : path.join(flags.base, flags.output);
  }

  #resolveBlobPath(outputDir: string): string {
    const { flags } = this;
    if (!flags.blob) return path.join(outputDir, 'snapshot.blob');
    return path.isAbsolute(flags.blob) ? flags.blob : path.join(flags.base, flags.blob);
  }

  private async runBuild(): Promise<void> {
    const { flags } = this;
    const outputDir = this.#resolveOutputDir();
    const blobPath = this.#resolveBlobPath(outputDir);
    const workerPath = path.join(outputDir, 'worker.js');

    if (!flags['skip-bundle']) {
      const { bundle } = await import('@eggjs/egg-bundler');
      const packAlias = parsePackAliases(flags['pack-alias'], flags.base);
      debug('snapshot build: bundling baseDir=%s output=%s', flags.base, outputDir);
      const result = await bundle({
        baseDir: flags.base,
        outputDir,
        framework: await getBundleFrameworkSpecifier(flags.base, flags.framework),
        mode: getBundleMode(flags.mode),
        snapshot: true,
        externals: {
          force: flags['force-external'],
          inline: flags['inline-external'],
        },
        ...(packAlias ? { pack: { resolve: { alias: packAlias } } } : {}),
      });
      this.log(`bundled (snapshot mode) to ${result.outputDir} (${result.files.length} files)`);
    }

    // Wrap: node --snapshot-blob <blob> --build-snapshot worker.js
    // EGG_BUNDLE_SNAPSHOT=build switches the generated entry into snapshot-build
    // mode (load metadata, run snapshotWillSerialize hooks, register the
    // deserialize main function).
    await this.#spawnNode(['--snapshot-blob', blobPath, '--build-snapshot', workerPath], {
      EGG_BUNDLE_SNAPSHOT: 'build',
    });

    // In dry-run nothing was spawned, so do not claim a blob was produced.
    if (flags['dry-run']) return;

    // node can exit 0 from --build-snapshot without producing a blob (e.g. the
    // entry threw after the will-serialize hooks and never reached
    // setDeserializeMainFunction). Verify the blob exists so a missing blob fails
    // loudly here rather than as a confusing error in a later `snapshot start`.
    try {
      await fs.access(blobPath);
    } catch {
      throw new Error(`snapshot build finished but no blob was written at ${blobPath}`);
    }
    this.log(`snapshot blob written to ${blobPath}`);
  }

  async #spawnNode(nodeArgs: readonly string[], extraEnv: NodeJS.ProcessEnv = {}): Promise<void> {
    // Run the self-contained bundle with a clean env: start from process.env, NOT
    // this.env. BaseCommand.#afterInit injects NODE_OPTIONS=--import @oxc-node/core/register
    // (plus tsconfig-paths) into this.env for TypeScript apps;
    // applying that to `node --build-snapshot worker.js` would pull a non-bundled
    // loader into the snapshot build. process.env never carries that injection.
    const env = { ...process.env, ...extraEnv };
    const args = [...this.globalExecArgv, ...nodeArgs];
    const fullCommand = `${process.execPath} ${args.join(' ')}`;
    if (this.flags['dry-run']) {
      this.log('dry run: $ %s', fullCommand);
      return;
    }

    debug('spawn: %s', fullCommand);
    // Use spawn (not fork) so no IPC channel is created — an IPC handle is a
    // non-serializable libuv resource that would break `--build-snapshot`.
    const proc = spawn(process.execPath, args, {
      stdio: 'inherit',
      env,
      cwd: this.flags.base,
    });

    // spawn (unlike fork + BaseCommand.graceful) does not forward termination
    // signals, so forward them ourselves so Ctrl-C during a build cleanly tears
    // down the child instead of orphaning it.
    let terminatingSignal: NodeJS.Signals | undefined;
    const forwardSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    const onSignal = (signal: NodeJS.Signals) => {
      terminatingSignal = signal;
      proc.kill(signal);
    };
    for (const signal of forwardSignals) {
      process.on(signal, onSignal);
    }

    try {
      await new Promise<void>((resolve, reject) => {
        proc.once('error', reject);
        proc.once('exit', (code, signal) => {
          // A signal-kill (code === null) is a failure unless we initiated the
          // shutdown — otherwise a crashed --build-snapshot (e.g. SIGSEGV while
          // serializing a non-serializable binding) would masquerade as success.
          if (code === 0 || terminatingSignal) {
            resolve();
          } else if (code !== null) {
            reject(new Error(`${fullCommand} exited with code ${code}`));
          } else {
            reject(new Error(`${fullCommand} was killed by signal ${signal}`));
          }
        });
      });
    } finally {
      for (const signal of forwardSignals) {
        process.removeListener(signal, onSignal);
      }
      // Re-raise the signal on ourselves so the parent exits with the correct
      // signal status (so chained shells / `&&` see the abort), now that our
      // listeners are removed and the child has terminated.
      if (terminatingSignal) {
        process.kill(process.pid, terminatingSignal);
      }
    }
  }
}
