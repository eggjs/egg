import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export interface PackEntry {
  readonly name: string;
  readonly filepath: string;
}

export type BuildFunc = (config: { config: unknown }, projectPath: string, rootPath: string) => Promise<void>;

export interface PackRunnerResolveConfig {
  readonly alias?: Readonly<Record<string, string>>;
  readonly [key: string]: unknown;
}

export interface PackRunnerOptions {
  readonly entries: readonly PackEntry[];
  readonly outputDir: string;
  readonly externals: Readonly<Record<string, string>>;
  readonly projectPath: string;
  readonly rootPath?: string;
  readonly mode?: 'production' | 'development';
  readonly buildFunc?: BuildFunc;
  readonly resolve?: PackRunnerResolveConfig;
  /**
   * Emit a single self-contained file per entry instead of @utoo/pack's default
   * multi-chunk standalone output. A standalone `worker.js` is a tiny loader that
   * does `require("./_turbopack__runtime.js")` and pulls in sibling chunks at
   * runtime; that user-land require of sibling chunks is exactly what a V8 startup
   * snapshot builder forbids. With single-file mode @utoo/pack inlines every module
   * into one self-executing IIFE (`((__UTOOPACK__)=>{...})([...modules])`), so the
   * output worker.js requires no sibling chunk and is snapshot-eligible.
   */
  readonly singleFile?: boolean;
}

export interface PackRunnerResult {
  readonly outputDir: string;
  readonly files: readonly string[];
}

// @utoo/pack (Turbopack) resolves the tsconfig that governs compilation from the
// PROJECT directory (the `projectPath` passed to `build()`), NOT the output dir and
// NOT via per-file find-up to the nearest tsconfig. Verified against @utoo/pack
// 1.4.13/1.4.14: a tsconfig in the output dir is ignored, and a tsconfig nearer the
// source than projectPath is ignored — only `projectPath/tsconfig.json` wins.
//
// So PackRunner writes this tsconfig into `projectPath`. The Bundler points
// `projectPath` at the generated entry dir (a build-managed `.egg-bundle/entries`
// directory) with `rootPath` at the app baseDir, so this config governs the whole
// build without touching the application's own tsconfig.
//
// `experimentalDecorators` / `emitDecoratorMetadata`: required so tegg decorator
// metadata is emitted (design:type).
//
// `useDefineForClassFields: false` matches how Egg apps compile (target <= ES2021):
// declared-but-uninitialized TypeScript class fields (e.g. `createdAt: Date;` on a
// leoric `Bone` model) must NOT become native own class fields. At `target: es2022`
// TS/SWC default this to `true`, emitting own `undefined` properties that shadow the
// getter/setter accessors ORMs like leoric install on the prototype for decorated
// attributes — silently breaking attribute writes (observed as omitted columns such
// as `gmt_create` on INSERT). With this tsconfig in the resolved location the bare
// field declarations are erased, so no output post-processing is needed.
const COMPILER_TSCONFIG = {
  compilerOptions: {
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    target: 'es2022',
    useDefineForClassFields: false,
  },
};

// @utoo/pack emits CJS files; a nested `type: commonjs` package.json
// prevents the parent ESM package from forcing these into ESM parse mode.
const OUTPUT_PACKAGE_JSON = { type: 'commonjs' };

// A directory egg-bundler owns and may freely write the compiler tsconfig into
// (the generated entry dir lives under `.egg-bundle`).
function isBuildManaged(dir: string): boolean {
  return dir.split(path.sep).includes('.egg-bundle');
}

const require = createRequire(import.meta.url);

// Use CJS entry explicitly: under pnpm workspace links the ESM build's
// extensionless relative imports fail to resolve.
const DEFAULT_BUILD_FUNC: BuildFunc = async (wrapped, projectPath, rootPath) => {
  const mod = require('@utoo/pack/cjs/commands/build.js') as {
    build: (options: unknown, projectPath?: string, rootPath?: string) => Promise<void>;
  };
  await mod.build(wrapped, projectPath, rootPath);
};

export class PackRunner {
  readonly #options: PackRunnerOptions;

  constructor(options: PackRunnerOptions) {
    this.#options = options;
  }

  async run(): Promise<PackRunnerResult> {
    const {
      entries,
      outputDir,
      externals,
      projectPath,
      rootPath = projectPath,
      mode = 'production',
      buildFunc = DEFAULT_BUILD_FUNC,
      resolve,
      singleFile = false,
    } = this.#options;

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, 'package.json'), JSON.stringify(OUTPUT_PACKAGE_JSON, null, 2));

    // Write the compiler tsconfig into the PROJECT dir, where @utoo/pack resolves
    // it (see COMPILER_TSCONFIG). projectPath must be a build-managed directory
    // (the Bundler passes the generated `.egg-bundle/entries` dir). Guard against
    // an API misuse that points projectPath at a real project: never silently
    // overwrite a tsconfig.json egg-bundler did not create.
    const projectTsconfigPath = path.join(projectPath, 'tsconfig.json');
    const desiredTsconfig = JSON.stringify(COMPILER_TSCONFIG, null, 2);
    if (!isBuildManaged(projectPath)) {
      const existing = await fs.readFile(projectTsconfigPath, 'utf8').catch(() => undefined);
      // Overwrite only what we produced ourselves (idempotent re-runs); never
      // clobber a different, user-authored tsconfig.
      if (existing !== undefined && existing !== desiredTsconfig) {
        throw new Error(
          `PackRunner: refusing to overwrite an existing tsconfig.json at ${projectPath}. ` +
            'projectPath must be a build-managed directory (e.g. the generated .egg-bundle/entries dir).',
        );
      }
    }
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(projectTsconfigPath, desiredTsconfig);

    // UMD-form externals ({ commonjs, root }) make @utoo/pack's standalone
    // output emit a `require(name)` branch under `typeof exports === 'object'`,
    // which is what node picks. Plain string externals only emit the
    // `globalThis[name]` branch, unusable for direct node execution.
    const umdExternals: Record<string, { commonjs: string; root: string }> = {};
    for (const [k, v] of Object.entries(externals)) {
      umdExternals[k] = { commonjs: v, root: v };
    }

    const resolveConfig = this.#buildResolveConfig(resolve);

    // Single-file mode: @utoo/pack's `export` output type with a per-entry
    // `library: { name }` inlines every module into one self-executing IIFE
    // (`((__UTOOPACK__)=>{...})([...modules])`), so the emitted worker.js carries
    // no sibling-chunk require — required for V8 startup snapshots. The default
    // `standalone` type emits a tiny loader plus sibling chunks instead.
    const config = {
      entry: singleFile
        ? entries.map((e) => ({ name: e.name, import: e.filepath, library: { name: 'app' } }))
        : entries.map((e) => ({ name: e.name, import: e.filepath })),
      target: 'node 22',
      platform: 'node',
      mode,
      output: {
        path: outputDir,
        type: singleFile ? 'export' : 'standalone',
      },
      externals: umdExternals,
      ...(resolveConfig ? { resolve: resolveConfig } : {}),
      optimization: {
        treeShaking: false,
        minify: false,
      },
    };

    try {
      await buildFunc({ config }, projectPath, rootPath);
    } catch (err) {
      const names = entries.map((e) => e.name).join(', ');
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`PackRunner failed to build ${names}: ${message}`, { cause: err });
    }

    const files = await this.#collectFiles(outputDir);
    return { outputDir, files };
  }

  #buildResolveConfig(resolve: PackRunnerResolveConfig | undefined): PackRunnerResolveConfig | undefined {
    if (!resolve) return undefined;

    const { alias, ...rest } = resolve;
    const resolveConfig = {
      ...rest,
      ...(alias && Object.keys(alias).length > 0 ? { alias: { ...alias } } : {}),
    };

    return Object.keys(resolveConfig).length > 0 ? resolveConfig : undefined;
  }

  async #collectFiles(dir: string): Promise<readonly string[]> {
    const files: string[] = [];
    await this.#collectFilesInDir(dir, dir, files);
    return files.sort();
  }

  async #collectFilesInDir(rootDir: string, currentDir: string, files: string[]): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const filepath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await this.#collectFilesInDir(rootDir, filepath, files);
        } else if (entry.isFile()) {
          files.push(path.relative(rootDir, filepath));
        }
      }),
    );
  }
}
