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

export interface PackRunnerLoaderItem {
  readonly loader: string;
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface PackRunnerModuleRule {
  readonly loaders: readonly PackRunnerLoaderItem[];
  readonly condition?: {
    readonly path?: string | RegExp;
  };
}

export interface PackRunnerModuleConfig {
  readonly rules: Readonly<Record<string, PackRunnerModuleRule>>;
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
  /** Internal source transforms passed to @utoo/pack module.rules. */
  readonly module?: PackRunnerModuleConfig;
  /** Emit one self-contained file per entry. Defaults to true. */
  readonly singleFile?: boolean;
  /**
   * Compiler class-field semantics. Egg apps use false for ORM compatibility;
   * standalone workers use true to preserve private field declarations.
   */
  readonly useDefineForClassFields?: boolean;
}

export interface PackRunnerResult {
  readonly outputDir: string;
  readonly files: readonly string[];
}

// @utoo/pack reads compiler options from projectPath/tsconfig.json. Decorator
// metadata is required by tegg; Egg's default class-field mode avoids shadowing
// ORM accessors with declared-but-uninitialized fields.
const compilerTsconfig = (useDefineForClassFields: boolean) => ({
  compilerOptions: {
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    target: 'es2022',
    useDefineForClassFields,
  },
});

// Keep @utoo/pack's CommonJS output independent of a parent ESM package.
const OUTPUT_PACKAGE_JSON = { type: 'commonjs' };

// Only .egg-bundle directories are unconditionally writable build state.
function isBuildManaged(dir: string): boolean {
  return dir.split(path.sep).includes('.egg-bundle');
}

const require = createRequire(import.meta.url);

// The CJS entry resolves correctly through pnpm workspace links.
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
      module,
      singleFile = true,
      useDefineForClassFields = false,
    } = this.#options;

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, 'package.json'), JSON.stringify(OUTPUT_PACKAGE_JSON, null, 2));

    // Never overwrite a user-owned tsconfig when projectPath is misconfigured.
    const projectTsconfigPath = path.join(projectPath, 'tsconfig.json');
    const desiredTsconfig = JSON.stringify(compilerTsconfig(useDefineForClassFields), null, 2);
    if (!isBuildManaged(projectPath)) {
      const existing = await fs.readFile(projectTsconfigPath, 'utf8').catch(() => undefined);
      if (existing !== undefined && existing !== desiredTsconfig) {
        throw new Error(
          `PackRunner: refusing to overwrite an existing tsconfig.json at ${projectPath}. ` +
            'projectPath must be a build-managed directory (e.g. the generated .egg-bundle/entries dir).',
        );
      }
    }
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(projectTsconfigPath, desiredTsconfig);

    // Single-file output has no CommonJS exports scope, so externals must emit
    // direct require() calls. Multi-file standalone output uses its UMD form.
    const externalsConfig: Record<string, { commonjs: string; root: string } | { root: string; type: 'commonjs' }> = {};
    for (const [k, v] of Object.entries(externals)) {
      externalsConfig[k] = singleFile ? { root: v, type: 'commonjs' } : { commonjs: v, root: v };
    }

    const resolveConfig = this.#buildResolveConfig(resolve);

    // `export` inlines one entry; `standalone` emits a loader and sibling chunks.
    const config = {
      entry: entries.map((e) => ({
        name: e.name,
        import: e.filepath,
        ...(singleFile ? { library: { name: 'app' } } : {}),
      })),
      target: 'node 22',
      platform: 'node',
      mode,
      output: {
        path: outputDir,
        type: singleFile ? 'export' : 'standalone',
      },
      externals: externalsConfig,
      ...(resolveConfig ? { resolve: resolveConfig } : {}),
      ...(module ? { module } : {}),
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
