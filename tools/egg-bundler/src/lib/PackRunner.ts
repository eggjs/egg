import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export interface PackEntry {
  readonly name: string;
  readonly filepath: string;
}

export type BuildFunc = (config: { config: unknown }, projectPath: string, rootPath: string) => Promise<void>;

export interface PackRunnerOptions {
  readonly entries: readonly PackEntry[];
  readonly outputDir: string;
  readonly externals: Readonly<Record<string, string>>;
  readonly projectPath: string;
  readonly rootPath?: string;
  readonly mode?: 'production' | 'development';
  readonly buildFunc?: BuildFunc;
}

export interface PackRunnerResult {
  readonly outputDir: string;
  readonly files: readonly string[];
}

interface PackageJson {
  readonly exports?: unknown;
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

// @utoo/pack 1.4.1 resolves this package's browser/default export even for
// node builds, which drops the named createSupportsColor export.
const NODE_CONDITION_ALIAS_DEPS = [
  {
    issuerPackage: 'supports-hyperlinks',
    dependency: 'supports-color',
  },
] as const;

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

    const nodeConditionAliases = await this.#resolveNodeConditionAliases(projectPath);

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
      ...(Object.keys(nodeConditionAliases).length > 0 ? { resolve: { alias: nodeConditionAliases } } : {}),
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

  async #resolveNodeConditionAliases(projectPath: string): Promise<Record<string, string>> {
    const aliases: Record<string, string> = {};

    for (const { issuerPackage, dependency } of NODE_CONDITION_ALIAS_DEPS) {
      const issuerDir = await this.#findPackageDir(issuerPackage, projectPath);
      if (!issuerDir) continue;

      const dependencyDir = await this.#findPackageDir(dependency, issuerDir);
      if (!dependencyDir) continue;

      const pkg = await this.#readPackageJson(dependencyDir);
      const nodeEntry = this.#resolveExportsNodeEntry(pkg.exports);
      if (!nodeEntry) continue;

      aliases[dependency] = this.#resolvePackageEntryPath(dependencyDir, nodeEntry);
    }

    return aliases;
  }

  async #findPackageDir(name: string, fromDir: string): Promise<string | undefined> {
    const nameParts = name.split('/');
    let dir = fromDir;
    while (true) {
      const candidate = path.join(dir, 'node_modules', ...nameParts);
      try {
        const stat = await fs.stat(candidate);
        if (stat.isDirectory()) return candidate;
      } catch {
        // continue walking upward
      }

      const parent = path.dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }

  async #readPackageJson(packageDir: string): Promise<PackageJson> {
    const packageJsonPath = path.join(packageDir, 'package.json');
    try {
      return JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as PackageJson;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw new Error(`[@eggjs/egg-bundler] failed to read ${packageJsonPath}`, { cause: error });
    }
  }

  #resolveExportsNodeEntry(exportsField: unknown): string | undefined {
    if (typeof exportsField === 'string') return exportsField;
    if (!exportsField || typeof exportsField !== 'object' || Array.isArray(exportsField)) return undefined;

    const map = exportsField as Record<string, unknown>;
    const keys = Object.keys(map);
    const rootTarget = keys.length > 0 && !keys.some((key) => key.startsWith('.')) ? map : map['.'];
    return this.#resolvePackageTarget(rootTarget);
  }

  #resolvePackageTarget(target: unknown, inNodeCondition = false): string | undefined {
    if (typeof target === 'string') return target;
    if (Array.isArray(target)) {
      for (const item of target) {
        const resolved = this.#resolvePackageTarget(item, inNodeCondition);
        if (resolved) return resolved;
      }
      return undefined;
    }
    if (!target || typeof target !== 'object') return undefined;

    const map = target as Record<string, unknown>;
    if (Object.hasOwn(map, 'node')) return this.#resolvePackageTarget(map.node, true);

    if (inNodeCondition) {
      for (const condition of ['import', 'default', 'require'] as const) {
        const resolved = this.#resolvePackageTarget(map[condition], true);
        if (resolved) return resolved;
      }
    }

    return undefined;
  }

  #resolvePackageEntryPath(packageDir: string, entry: string): string {
    if (path.isAbsolute(entry) || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(entry)) {
      throw new Error(`[@eggjs/egg-bundler] package export entry must be relative: ${entry}`);
    }

    const resolved = path.resolve(packageDir, entry);
    const rel = path.relative(packageDir, resolved);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`[@eggjs/egg-bundler] package export entry escapes package root: ${entry}`);
    }

    return resolved;
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
