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
}

export interface PackRunnerResult {
  readonly outputDir: string;
  readonly files: readonly string[];
}

// SWC decorator compilation picks up tsconfig from the OUTPUT dir, not the
// project. Without this, tegg decorator metadata silently drops. (T0 blocker.)
const OUTPUT_TSCONFIG = {
  compilerOptions: {
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    target: 'es2022',
  },
};

// @utoo/pack emits CJS files; a nested `type: commonjs` package.json
// prevents the parent ESM package from forcing these into ESM parse mode.
const OUTPUT_PACKAGE_JSON = { type: 'commonjs' };

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
    } = this.#options;

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, 'tsconfig.json'), JSON.stringify(OUTPUT_TSCONFIG, null, 2));
    await fs.writeFile(path.join(outputDir, 'package.json'), JSON.stringify(OUTPUT_PACKAGE_JSON, null, 2));

    // UMD-form externals ({ commonjs, root }) make @utoo/pack's standalone
    // output emit a `require(name)` branch under `typeof exports === 'object'`,
    // which is what node picks. Plain string externals only emit the
    // `globalThis[name]` branch, unusable for direct node execution.
    const umdExternals: Record<string, { commonjs: string; root: string }> = {};
    for (const [k, v] of Object.entries(externals)) {
      umdExternals[k] = { commonjs: v, root: v };
    }

    const resolveConfig = this.#buildResolveConfig(resolve);

    const config = {
      entry: entries.map((e) => ({ name: e.name, import: e.filepath })),
      target: 'node 22',
      platform: 'node',
      mode,
      output: {
        path: outputDir,
        type: 'standalone',
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
    if (!resolve?.alias || Object.keys(resolve.alias).length === 0) return undefined;
    return { alias: { ...resolve.alias } };
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
