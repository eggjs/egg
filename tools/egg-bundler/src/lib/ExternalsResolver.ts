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
  readonly main?: string;
  readonly dependencies?: Record<string, string>;
  readonly optionalDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
  readonly peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  readonly scripts?: Record<string, string>;
  readonly exports?: unknown;
  readonly napi?: unknown;
}

// install-time hooks using one of these tools strongly imply a native addon
const NATIVE_SCRIPT_PATTERN = /node-gyp|prebuild-install|napi-rs|node-pre-gyp|electron-rebuild/i;
const NATIVE_OPTIONAL_PLATFORM_TOKENS = new Set([
  'android',
  'darwin',
  'freebsd',
  'gnu',
  'linux',
  'msvc',
  'musl',
  'openharmony',
  'win32',
]);
const NATIVE_OPTIONAL_ARCH_TOKENS = new Set([
  'aarch64',
  'arm',
  'arm64',
  'ia32',
  'loong64',
  'ppc64',
  'riscv64',
  's390x',
  'wasm32',
  'x64',
]);
const CREATE_REQUIRE_EXPORT_CONDITIONS = new Set(['node-addons', 'node', 'require', 'default']);

interface ExternalizeDecision {
  readonly externalizePackage: boolean;
  readonly extraExternals: readonly string[];
}

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
      const inlinePackage = this.#inline.has(name) && !this.#force.has(name);
      await this.#addMissingOptionalPeerExternals(name, result);
      const decision = await this.#getExternalizeDecision(name, optionalDeps, peerDeps);
      for (const extraName of decision.extraExternals) {
        if (!result[extraName]) result[extraName] = extraName;
      }
      if (!inlinePackage && decision.externalizePackage) {
        result[name] = name;
      }
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
      if (await this.#findPackageDir(peerName, pkgDir)) continue;
      result[peerName] = peerName;
    }
  }

  async #getExternalizeDecision(
    name: string,
    optionalDeps: ReadonlySet<string>,
    peerDeps: ReadonlySet<string>,
  ): Promise<ExternalizeDecision> {
    let externalizePackage = optionalDeps.has(name) || peerDeps.has(name);

    const pkgDir = await this.#findPackageDir(name);
    if (!pkgDir) return { externalizePackage, extraExternals: [] };
    const pkg = await this.#readPackageJson(pkgDir);
    if (await this.#hasMissingOptionalPeerDependencies(pkgDir, pkg)) externalizePackage = true;
    if (await this.#hasNativeBinary(pkgDir, pkg)) externalizePackage = true;

    const nativeOptionalDeps = await this.#getNativeOptionalDependencies(pkgDir, pkg);
    const extraExternals = nativeOptionalDeps.filter(
      (depName) => !this.#inline.has(depName) || this.#force.has(depName),
    );
    if (nativeOptionalDeps.length > 0 && this.#canLoadPackageThroughCreateRequire(pkg)) {
      externalizePackage = true;
    }

    return { externalizePackage, extraExternals };
  }

  async #hasMissingOptionalPeerDependencies(pkgDir: string, pkg: PackageJson): Promise<boolean> {
    const peerDependencies = pkg.peerDependencies ?? {};
    const peerDependenciesMeta = pkg.peerDependenciesMeta ?? {};
    for (const peerName of Object.keys(peerDependencies)) {
      if (!peerDependenciesMeta[peerName]?.optional) continue;
      if (!(await this.#findPackageDir(peerName, pkgDir))) return true;
    }
    return false;
  }

  async #getNativeOptionalDependencies(pkgDir: string, pkg: PackageJson): Promise<readonly string[]> {
    const optionalDependencies = pkg.optionalDependencies ?? {};
    const result: string[] = [];
    for (const depName of Object.keys(optionalDependencies)) {
      const depDir = await this.#findPackageDir(depName, pkgDir);
      if (depDir) {
        const depPkg = await this.#readPackageJson(depDir);
        if (await this.#hasNativeBinary(depDir, depPkg)) {
          result.push(depName);
          continue;
        }
      }
      if (this.#isLikelyNativeOptionalDependency(pkg, depName)) {
        result.push(depName);
      }
    }
    return result;
  }

  async #findPackageDir(name: string, fromDir = this.#baseDir): Promise<string | undefined> {
    const cacheKey = `${fromDir}\0${name}`;
    const cached = this.#packageDirCache.get(cacheKey);
    if (cached) return cached;
    const result = this.#findPackageDirUncached(name, fromDir);
    this.#packageDirCache.set(cacheKey, result);
    return result;
  }

  async #findPackageDirUncached(name: string, fromDir: string): Promise<string | undefined> {
    let dir = fromDir;
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

  #canLoadPackageThroughCreateRequire(pkg: PackageJson): boolean {
    const exports = pkg.exports;
    if (exports !== undefined) {
      return this.#exportsTargetCanBeRequired(exports, pkg);
    }

    const main = pkg.main;
    if (typeof main === 'string') {
      return this.#packageTargetCanBeRequired(main, pkg);
    }

    return pkg.type !== 'module';
  }

  #exportsTargetCanBeRequired(target: unknown, pkg: PackageJson): boolean {
    if (typeof target === 'string') return this.#packageTargetCanBeRequired(target, pkg);
    if (Array.isArray(target)) return target.some((item) => this.#exportsTargetCanBeRequired(item, pkg));
    if (!this.#isRecord(target)) return false;

    const keys = Object.keys(target);
    if (keys.some((key) => key.startsWith('.'))) {
      if (!Object.hasOwn(target, '.')) return false;
      return this.#exportsTargetCanBeRequired(target['.'], pkg);
    }

    for (const condition of keys) {
      if (!CREATE_REQUIRE_EXPORT_CONDITIONS.has(condition)) continue;
      return this.#exportsTargetCanBeRequired(target[condition], pkg);
    }

    return false;
  }

  #packageTargetCanBeRequired(target: string, pkg: PackageJson): boolean {
    if (/\.(?:cjs|json|node)$/i.test(target)) return true;
    if (/\.mjs$/i.test(target)) return false;
    return pkg.type !== 'module';
  }

  #isLikelyNativeOptionalDependency(pkg: PackageJson, depName: string): boolean {
    const depBaseName = this.#getPackageBaseName(depName);
    const parentBaseName = pkg.name ? this.#getPackageBaseName(pkg.name) : undefined;
    const tokens = depBaseName.toLowerCase().split(/[-_]/g);
    const hasPlatformToken = tokens.some((token) => NATIVE_OPTIONAL_PLATFORM_TOKENS.has(token));
    const hasArchToken = tokens.some((token) => NATIVE_OPTIONAL_ARCH_TOKENS.has(token));
    if (!hasPlatformToken || !hasArchToken) return false;
    if (pkg.napi !== undefined) return true;
    return parentBaseName ? depBaseName === parentBaseName || depBaseName.startsWith(`${parentBaseName}-`) : false;
  }

  #getPackageBaseName(name: string): string {
    const slashIndex = name.lastIndexOf('/');
    return slashIndex === -1 ? name : name.slice(slashIndex + 1);
  }

  #isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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
