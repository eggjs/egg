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
  readonly peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  readonly scripts?: Record<string, string>;
  readonly exports?: unknown;
}

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
      await this.#addMissingOptionalPeerExternals(name, result);
    }

    for (const name of peerDeps) {
      if (this.#inline.has(name) && !this.#force.has(name)) continue;
      if (!result[name]) result[name] = name;
    }

    return result;
  }

  async #addMissingOptionalPeerExternals(name: string, result: Record<string, string>): Promise<void> {
    const pkgDir = await this.#findPackageDir(name);
    if (!pkgDir) return;
    const pkg = await this.#readPackageJson(pkgDir);
    const peerDependencies = pkg.peerDependencies ?? {};
    const peerDependenciesMeta = pkg.peerDependenciesMeta ?? {};
    for (const peerName of Object.keys(peerDependencies)) {
      if (result[peerName]) continue;
      if (this.#inline.has(peerName) && !this.#force.has(peerName)) continue;
      if (!peerDependenciesMeta[peerName]?.optional) continue;
      if (await this.#findPackageDir(peerName)) continue;
      result[peerName] = peerName;
    }
  }

  async #shouldExternalize(
    name: string,
    optionalDeps: ReadonlySet<string>,
    peerDeps: ReadonlySet<string>,
  ): Promise<boolean> {
    if (optionalDeps.has(name)) return true;
    if (peerDeps.has(name)) return true;

    const pkgDir = await this.#findPackageDir(name);
    if (!pkgDir) return false;
    const pkg = await this.#readPackageJson(pkgDir);
    if (await this.#hasMissingOptionalPeerDependencies(pkg)) return true;
    if (await this.#hasNativeBinary(pkgDir, pkg)) return true;
    return false;
  }

  async #hasMissingOptionalPeerDependencies(pkg: PackageJson): Promise<boolean> {
    const peerDependencies = pkg.peerDependencies ?? {};
    const peerDependenciesMeta = pkg.peerDependenciesMeta ?? {};
    for (const peerName of Object.keys(peerDependencies)) {
      if (!peerDependenciesMeta[peerName]?.optional) continue;
      if (!(await this.#findPackageDir(peerName))) return true;
    }
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

  async #readPackageJson(dir: string): Promise<PackageJson> {
    const cached = this.#packageJsonCache.get(dir);
    if (cached) return cached;
    const result = this.#readPackageJsonUncached(dir);
    this.#packageJsonCache.set(dir, result);
    return result;
  }

  async #readPackageJsonUncached(dir: string): Promise<PackageJson> {
    const packageJsonPath = path.join(dir, 'package.json');
    try {
      const raw = await fs.readFile(packageJsonPath, 'utf8');
      return JSON.parse(raw) as PackageJson;
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        return {};
      }
      throw new Error(`[@eggjs/egg-bundler] failed to read ${packageJsonPath}`, { cause: error });
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
