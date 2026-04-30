import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface ExternalsResolverOptions {
  readonly baseDir: string;
  readonly force?: readonly string[];
  readonly inline?: readonly string[];
}

export type ExternalsConfig = Record<string, string>;

interface PackageJson {
  readonly name?: string;
  readonly type?: string;
  readonly dependencies?: Record<string, string>;
  readonly optionalDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
  readonly scripts?: Record<string, string>;
  readonly exports?: unknown;
}

const ALWAYS_EXTERNAL_NAMES: ReadonlySet<string> = new Set(['egg', '@swc/helpers']);

// install-time hooks using one of these tools strongly imply a native addon
const NATIVE_SCRIPT_PATTERN = /node-gyp|prebuild-install|napi-rs|node-pre-gyp|electron-rebuild/i;

export class ExternalsResolver {
  readonly #baseDir: string;
  readonly #force: ReadonlySet<string>;
  readonly #inline: ReadonlySet<string>;
  readonly #packageDirCache = new Map<string, Promise<string | undefined>>();
  readonly #packageJsonCache = new Map<string, Promise<PackageJson>>();

  constructor(options: ExternalsResolverOptions) {
    this.#baseDir = options.baseDir;
    this.#force = new Set(options.force ?? []);
    this.#inline = new Set(options.inline ?? []);
  }

  async resolve(): Promise<ExternalsConfig> {
    const rootPkg = await this.#readPackageJson(this.#baseDir);
    const deps = new Set([
      ...Object.keys(rootPkg.dependencies ?? {}),
      ...Object.keys(rootPkg.optionalDependencies ?? {}),
    ]);
    const optionalDeps = new Set(Object.keys(rootPkg.optionalDependencies ?? {}));
    const peerDeps = new Set(Object.keys(rootPkg.peerDependencies ?? {}));
    const result: Record<string, string> = {};

    for (const name of this.#force) {
      result[name] = name;
    }

    for (const name of deps) {
      if (this.#inline.has(name) && !this.#force.has(name)) continue;
      if (result[name]) continue;
      if (await this.#shouldExternalize(name, optionalDeps, peerDeps)) {
        result[name] = name;
      }
    }

    for (const name of peerDeps) {
      if (this.#inline.has(name) && !this.#force.has(name)) continue;
      if (!result[name]) result[name] = name;
    }

    return result;
  }

  async #shouldExternalize(
    name: string,
    optionalDeps: ReadonlySet<string>,
    peerDeps: ReadonlySet<string>,
  ): Promise<boolean> {
    if (optionalDeps.has(name)) return true;
    if (peerDeps.has(name)) return true;
    if (ALWAYS_EXTERNAL_NAMES.has(name)) return true;
    if (name.startsWith('@eggjs/')) return true;

    const pkgDir = await this.#findPackageDir(name);
    if (!pkgDir) return false;
    const pkg = await this.#readPackageJson(pkgDir);
    if (await this.#hasNativeBinary(pkgDir, pkg)) return true;
    if (this.#isEsmOnly(pkg)) return true;
    return false;
  }

  async #findPackageDir(name: string): Promise<string | undefined> {
    const cached = this.#packageDirCache.get(name);
    if (cached) return cached;
    const result = this.#findPackageDirUncached(name);
    this.#packageDirCache.set(name, result);
    return result;
  }

  async #findPackageDirUncached(name: string): Promise<string | undefined> {
    let dir = this.#baseDir;
    while (true) {
      const candidate = path.join(dir, 'node_modules', name);
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

  async #hasNativeBinary(pkgDir: string, pkg: PackageJson): Promise<boolean> {
    const scripts = pkg.scripts ?? {};
    for (const hook of ['install', 'postinstall', 'preinstall'] as const) {
      const script = scripts[hook];
      if (script && NATIVE_SCRIPT_PATTERN.test(script)) return true;
    }

    if (await this.#pathExists(path.join(pkgDir, 'binding.gyp'))) return true;

    try {
      const prebuilds = await fs.readdir(path.join(pkgDir, 'prebuilds'));
      if (prebuilds.length > 0) return true;
    } catch {
      // no prebuilds dir
    }

    try {
      const entries = await fs.readdir(pkgDir);
      if (entries.some((e) => e.endsWith('.node'))) return true;
    } catch {
      // unreadable dir
    }

    return false;
  }

  #isEsmOnly(pkg: PackageJson): boolean {
    if (pkg.type !== 'module') return false;
    const exportsField = pkg.exports;
    if (!exportsField) return false;
    if (typeof exportsField === 'string') return true;
    if (typeof exportsField !== 'object') return false;
    return !this.#hasRequireCondition(exportsField);
  }

  #hasRequireCondition(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) {
      return value.some((v) => this.#hasRequireCondition(v));
    }
    const obj = value as Record<string, unknown>;
    if ('require' in obj) return true;
    for (const v of Object.values(obj)) {
      if (this.#hasRequireCondition(v)) return true;
    }
    return false;
  }

  async #readPackageJson(dir: string): Promise<PackageJson> {
    const cached = this.#packageJsonCache.get(dir);
    if (cached) return cached;
    const result = this.#readPackageJsonUncached(dir);
    this.#packageJsonCache.set(dir, result);
    return result;
  }

  async #readPackageJsonUncached(dir: string): Promise<PackageJson> {
    try {
      const raw = await fs.readFile(path.join(dir, 'package.json'), 'utf8');
      return JSON.parse(raw) as PackageJson;
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  async #pathExists(p: string): Promise<boolean> {
    try {
      await fs.stat(p);
      return true;
    } catch {
      return false;
    }
  }
}
