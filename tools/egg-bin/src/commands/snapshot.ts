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
 * `snapshot build` bundles the app in snapshot mode and then wraps Node's
 * `--build-snapshot` command. The default target builds one self-contained
 * worker.js and blob; `--cluster` builds independent app and agent entries and
 * blobs.
 *
 * Booting from the blob is a production-runtime concern and lives in
 * `@eggjs/scripts`: `egg-scripts start --snapshot-blob <blob>`.
 */
export default class Snapshot<T extends typeof Snapshot> extends BaseCommand<T> {
  static override description = 'Build a V8 startup snapshot of a bundled egg app';

  static override examples = [
    '<%= config.bin %> <%= command.id %> build',
    '<%= config.bin %> <%= command.id %> build --output ./dist-bundle --blob ./dist-bundle/snapshot.blob',
    '<%= config.bin %> <%= command.id %> build --cluster --app-snapshot-blob ./dist-bundle/app.snapshot.blob --agent-snapshot-blob ./dist-bundle/agent.snapshot.blob',
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
      description: 'bundle output directory (also where generated worker files live)',
      default: './dist-bundle',
    }),
    blob: Flags.string({
      description: 'single-process snapshot blob path (defaults to <output>/snapshot.blob)',
      exclusive: ['cluster'],
    }),
    'app-snapshot-blob': Flags.string({
      description: 'app worker snapshot blob path in cluster mode (defaults to <output>/app.snapshot.blob)',
      dependsOn: ['cluster'],
    }),
    'agent-snapshot-blob': Flags.string({
      description: 'agent worker snapshot blob path in cluster mode (defaults to <output>/agent.snapshot.blob)',
      dependsOn: ['cluster'],
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
      description: 'skip bundling and build from existing worker file(s) (build only)',
      default: false,
    }),
    cluster: Flags.boolean({
      description:
        'build independent app and agent worker snapshots (defaults to app.snapshot.blob and agent.snapshot.blob)',
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

  #resolveClusterBlobPath(role: 'app' | 'agent', outputDir: string): string {
    const value = this.flags[`${role}-snapshot-blob`];
    if (!value) return path.join(outputDir, `${role}.snapshot.blob`);
    return path.isAbsolute(value) ? value : path.join(this.flags.base, value);
  }

  private async runBuild(): Promise<void> {
    const { flags } = this;
    if (!flags.cluster && (flags['app-snapshot-blob'] || flags['agent-snapshot-blob'])) {
      throw new Error('--app-snapshot-blob and --agent-snapshot-blob require --cluster');
    }
    const outputDir = this.#resolveOutputDir();
    const snapshotEntries = flags.cluster
      ? [
          {
            role: 'app',
            workerPath: path.join(outputDir, 'app_worker.js'),
            blobPath: this.#resolveClusterBlobPath('app', outputDir),
          },
          {
            role: 'agent',
            workerPath: path.join(outputDir, 'agent_worker.js'),
            blobPath: this.#resolveClusterBlobPath('agent', outputDir),
          },
        ]
      : [
          {
            role: 'single',
            workerPath: path.join(outputDir, 'worker.js'),
            blobPath: this.#resolveBlobPath(outputDir),
          },
        ];

    if (!flags['skip-bundle']) {
      const { bundle } = await import('@eggjs/egg-bundler');
      const packAlias = parsePackAliases(flags['pack-alias'], flags.base);
      debug('snapshot build: bundling baseDir=%s output=%s', flags.base, outputDir);
      const result = await bundle({
        baseDir: flags.base,
        outputDir,
        framework: await getBundleFrameworkSpecifier(flags.base, flags.framework),
        mode: getBundleMode(flags.mode),
        target: flags.cluster ? 'cluster' : 'single',
        snapshot: true,
        externals: {
          force: flags['force-external'],
          inline: flags['inline-external'],
        },
        ...(packAlias ? { pack: { resolve: { alias: packAlias } } } : {}),
      });
      this.log(`bundled (snapshot mode) to ${result.outputDir} (${result.files.length} files)`);
    }

    // Each cluster role has its own generated entry and heap. Build them
    // independently instead of asking one entry to switch roles through an env
    // variable; EGG_BUNDLE_SNAPSHOT only selects build versus normal runtime.
    for (const entry of snapshotEntries) {
      await this.#spawnNode(['--snapshot-blob', entry.blobPath, '--build-snapshot', entry.workerPath], {
        EGG_BUNDLE_SNAPSHOT: 'build',
      });
    }

    // In dry-run nothing was spawned, so do not claim a blob was produced.
    if (flags['dry-run']) return;

    // node can exit 0 from --build-snapshot without producing a blob (e.g. the
    // entry threw after the will-serialize hooks and never reached
    // setDeserializeMainFunction). Verify the blob exists so a missing blob fails
    // loudly here rather than as a confusing error in a later `snapshot start`.
    for (const entry of snapshotEntries) {
      try {
        await fs.access(entry.blobPath);
      } catch {
        const role = entry.role === 'single' ? '' : ` ${entry.role}`;
        throw new Error(`snapshot build finished but no${role} blob was written at ${entry.blobPath}`);
      }
      const role = entry.role === 'single' ? '' : `${entry.role} `;
      this.log(`${role}snapshot blob written to ${entry.blobPath}`);
    }
    // Building works on Node.js >= 22, but restoring the blob requires Node.js
    // >= 24 (Node.js 22 aborts while deserializing a non-trivial egg heap).
    // Surface that here so the requirement is visible at build time.
    this.log('note: restoring this snapshot requires Node.js >= 24 (e.g. `egg-scripts start --snapshot-blob`)');
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
