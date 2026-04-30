import fsp from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { debuglog } from 'node:util';

import { ManifestStore, type StartupManifest } from '@eggjs/core';
import { execaNode } from 'execa';

const debug = debuglog('egg/bundler/manifest-loader');

const SUPPORTED_MANIFEST_VERSION = 1;
const FRAMEWORK_DEFAULT = 'egg';
const PACKAGE_ENTRY_CONDITIONS = ['import', 'module', 'node', 'default', 'require', 'development', 'production'];

export interface ManifestLoaderOptions {
  baseDir: string;
  framework?: string;
  manifestPath?: string;
  autoGenerate?: boolean;
  env?: string;
  scope?: string;
  execArgv?: string[];
}

interface TeggModuleDescriptor {
  unitPath: string;
  decoratedFiles?: string[];
}

interface TeggManifestExtension {
  moduleDescriptors?: TeggModuleDescriptor[];
}

interface ModuleMapEntry {
  realDir: string;
  normalizedDir: string;
}

export class ManifestLoader {
  readonly #baseDir: string;
  readonly #manifestPath: string;
  readonly #autoGenerate: boolean;
  readonly #env: string | undefined;
  readonly #scope: string | undefined;
  readonly #framework: string;
  readonly #execArgv: string[] | undefined;
  readonly #baseRequire: NodeJS.Require;
  readonly #realpathCache = new Map<string, string>();
  #manifest: StartupManifest | undefined;
  #store: ManifestStore | undefined;

  constructor(options: ManifestLoaderOptions) {
    this.#baseDir = options.baseDir;
    this.#manifestPath = options.manifestPath ?? path.join(options.baseDir, '.egg', 'manifest.json');
    this.#autoGenerate = options.autoGenerate ?? false;
    this.#env = options.env;
    this.#scope = options.scope;
    this.#framework = options.framework ?? FRAMEWORK_DEFAULT;
    this.#execArgv = options.execArgv;
    this.#baseRequire = createRequire(path.join(this.#baseDir, 'package.json'));
  }

  async load(): Promise<StartupManifest> {
    if (this.#manifest) return this.#manifest;

    let data = await this.#readFromDisk();
    if (!data) {
      if (!this.#autoGenerate) {
        throw new Error(`[@eggjs/egg-bundler] manifest not found at ${this.#manifestPath}`);
      }
      await this.#generate();
      data = await this.#readFromDisk();
      if (!data) {
        throw new Error(`[@eggjs/egg-bundler] manifest generation did not produce ${this.#manifestPath}`);
      }
    }

    const normalized = await this.#normalize(data);
    this.#manifest = normalized;
    this.#store = ManifestStore.fromBundle(normalized, this.#baseDir);
    return normalized;
  }

  get manifest(): StartupManifest {
    if (!this.#manifest) {
      throw new Error('[@eggjs/egg-bundler] ManifestLoader.load() must be awaited before accessing manifest');
    }
    return this.#manifest;
  }

  get store(): ManifestStore {
    if (!this.#store) {
      throw new Error('[@eggjs/egg-bundler] ManifestLoader.load() must be awaited before accessing store');
    }
    return this.#store;
  }

  getAllDiscoveredFiles(): string[] {
    const m = this.manifest;
    const files: string[] = [];
    for (const [relDir, relFiles] of Object.entries(m.fileDiscovery)) {
      const absDir = this.#resolveFromBase(relDir);
      for (const relFile of relFiles) {
        files.push(path.resolve(absDir, relFile));
      }
    }
    files.sort();
    return files;
  }

  getTeggDecoratedFiles(): string[] {
    const ext = this.manifest.extensions?.tegg as TeggManifestExtension | undefined;
    const descriptors = ext?.moduleDescriptors;
    if (!descriptors) return [];
    const files: string[] = [];
    for (const desc of descriptors) {
      const unitAbs = path.isAbsolute(desc.unitPath) ? desc.unitPath : this.#resolveFromBase(desc.unitPath);
      for (const rel of desc.decoratedFiles ?? []) {
        files.push(path.resolve(unitAbs, rel));
      }
    }
    files.sort();
    return files;
  }

  #resolveFromBase(rel: string): string {
    if (path.isAbsolute(rel)) return rel;
    if (rel.startsWith('node_modules/')) {
      const rest = rel.slice('node_modules/'.length);
      const slashIdx = rest.startsWith('@') ? rest.indexOf('/', rest.indexOf('/') + 1) : rest.indexOf('/');
      const pkgName = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
      const sub = slashIdx === -1 ? '' : rest.slice(slashIdx + 1);
      try {
        const pkgJson = this.#baseRequire.resolve(`${pkgName}/package.json`);
        return path.resolve(path.dirname(pkgJson), sub);
      } catch {
        return path.resolve(this.#baseDir, rel);
      }
    }
    return path.resolve(this.#baseDir, rel);
  }

  async #readFromDisk(): Promise<StartupManifest | undefined> {
    let raw: string;
    try {
      raw = await fsp.readFile(this.#manifestPath, 'utf-8');
    } catch {
      return undefined;
    }
    let parsed: StartupManifest;
    try {
      parsed = JSON.parse(raw) as StartupManifest;
    } catch (error) {
      throw new Error(
        `[@eggjs/egg-bundler] invalid manifest JSON at ${this.#manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    if (parsed.version !== SUPPORTED_MANIFEST_VERSION) {
      throw new Error(
        `[@eggjs/egg-bundler] manifest version mismatch at ${this.#manifestPath}: expected ${SUPPORTED_MANIFEST_VERSION}, got ${parsed.version}`,
      );
    }
    return parsed;
  }

  async #generate(): Promise<void> {
    const scriptUrl = new URL('../scripts/generate-manifest.mjs', import.meta.url);
    const scriptPath = fileURLToPath(scriptUrl);
    try {
      await fsp.access(scriptPath);
    } catch {
      throw new Error(`[@eggjs/egg-bundler] manifest auto-generation is not available: ${scriptPath} does not exist`);
    }
    const payload = {
      baseDir: this.#baseDir,
      framework: this.#resolveFrameworkPath(),
      frameworkEntry: await this.#resolveFrameworkEntryUrl(),
      env: this.#env,
      scope: this.#scope,
    };
    debug('execa generate-manifest: %o', payload);

    await execaNode(scriptPath, [JSON.stringify(payload)], {
      stdio: 'inherit',
      nodeOptions: this.#buildExecArgv(),
      env: {
        ...process.env,
        EGG_MANIFEST: 'true',
      },
    });
  }

  #isTsxImportTarget(specifier: string): boolean {
    if (specifier === 'tsx' || specifier === 'tsx/esm') return true;

    let normalized = specifier;
    if (specifier.startsWith('file://')) {
      try {
        normalized = fileURLToPath(specifier);
      } catch {
        return false;
      }
    }

    normalized = normalized.replaceAll('\\', '/');
    return normalized.endsWith('/tsx/dist/esm/index.mjs') || normalized.endsWith('/tsx/esm/index.mjs');
  }

  #hasTsxLoader(base: readonly string[]): boolean {
    for (let i = 0; i < base.length; i++) {
      const arg = base[i];
      let importTarget: string | undefined;

      if (arg === '--import') {
        importTarget = base[i + 1];
        i++;
      } else if (arg.startsWith('--import=')) {
        importTarget = arg.slice('--import='.length);
      }

      if (importTarget && this.#isTsxImportTarget(importTarget)) return true;
    }

    return false;
  }

  #buildExecArgv(): string[] {
    const base = this.#execArgv ?? process.execArgv;
    if (this.#hasTsxLoader(base)) return [...base];
    try {
      const req = createRequire(import.meta.url);
      const tsxEsm = req.resolve('tsx/esm');
      return [...base, `--import=${pathToFileURL(tsxEsm).href}`];
    } catch {
      debug('tsx/esm not resolvable from @eggjs/egg-bundler; falling back to inherited execArgv');
      return [...base];
    }
  }

  #resolvePackageEntry(target: unknown): string | undefined {
    if (typeof target === 'string') return target;
    if (Array.isArray(target)) {
      for (const item of target) {
        const resolved = this.#resolvePackageEntry(item);
        if (resolved) return resolved;
      }
      return undefined;
    }
    if (!target || typeof target !== 'object') return undefined;

    const map = target as Record<string, unknown>;
    const used = new Set<string>();
    for (const key of PACKAGE_ENTRY_CONDITIONS) {
      used.add(key);
      const resolved = this.#resolvePackageEntry(map[key]);
      if (resolved) return resolved;
    }
    for (const [key, value] of Object.entries(map)) {
      if (used.has(key)) continue;
      const resolved = this.#resolvePackageEntry(value);
      if (resolved) return resolved;
    }
    return undefined;
  }

  #resolveExportsEntry(exportsField: Record<string, unknown> | string): string | undefined {
    if (typeof exportsField === 'string') return exportsField;

    const keys = Object.keys(exportsField);
    const rootTarget = keys.length > 0 && !keys.some((key) => key.startsWith('.')) ? exportsField : exportsField['.'];
    return this.#resolvePackageEntry(rootTarget);
  }

  #resolvePackageEntryUrl(frameworkDir: string, entryRel: string, pkgJsonPath: string): string {
    if (path.isAbsolute(entryRel) || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(entryRel)) {
      throw new Error(`[@eggjs/egg-bundler] framework package ${pkgJsonPath} entry must be a relative path`);
    }
    const entryPath = path.resolve(frameworkDir, entryRel);
    const rel = path.relative(frameworkDir, entryPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`[@eggjs/egg-bundler] framework package ${pkgJsonPath} entry escapes package root`);
    }
    return pathToFileURL(entryPath).href;
  }

  async #resolveFrameworkEntryUrl(): Promise<string> {
    const frameworkDir = this.#resolveFrameworkPath();
    const pkgJsonPath = path.join(frameworkDir, 'package.json');
    const pkg = JSON.parse(await fsp.readFile(pkgJsonPath, 'utf-8')) as {
      exports?: Record<string, unknown> | string;
      main?: string;
      module?: string;
    };
    let entryRel: string | undefined;
    if (pkg.exports) {
      entryRel = this.#resolveExportsEntry(pkg.exports);
    }
    entryRel = entryRel ?? pkg.module ?? pkg.main;
    if (!entryRel) {
      throw new Error(`[@eggjs/egg-bundler] framework package ${pkgJsonPath} has no resolvable entry`);
    }
    return this.#resolvePackageEntryUrl(frameworkDir, entryRel, pkgJsonPath);
  }

  #resolveFrameworkPath(): string {
    if (path.isAbsolute(this.#framework)) return this.#framework;
    try {
      const pkgJson = this.#baseRequire.resolve(`${this.#framework}/package.json`);
      return path.dirname(pkgJson);
    } catch {
      return this.#framework;
    }
  }

  // --- Key normalization ---

  async #normalize(data: StartupManifest): Promise<StartupManifest> {
    const moduleMap = await this.#buildModuleMap();
    debug('moduleMap size: %d', moduleMap.length);

    const normalizedDiscovery: Record<string, string[]> = {};
    for (const [key, files] of Object.entries(data.fileDiscovery)) {
      const newKey = await this.#normalizeRelKey(key, moduleMap);
      normalizedDiscovery[newKey] = files;
    }

    const normalizedResolveCache: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(data.resolveCache)) {
      const newKey = await this.#normalizeRelKey(key, moduleMap);
      const newValue = value === null ? null : await this.#normalizeRelKey(value, moduleMap);
      normalizedResolveCache[newKey] = newValue;
    }

    const normalizedExtensions = await this.#normalizeExtensions(data.extensions ?? {}, moduleMap);

    return {
      ...data,
      extensions: normalizedExtensions,
      fileDiscovery: normalizedDiscovery,
      resolveCache: normalizedResolveCache,
    };
  }

  async #normalizeRelKey(relKey: string, moduleMap: ModuleMapEntry[]): Promise<string> {
    if (!relKey) return relKey;
    // Already inside baseDir, relative, and not escaping — leave as-is.
    if (
      !path.isAbsolute(relKey) &&
      !relKey.startsWith('..') &&
      !relKey.includes('node_modules/') &&
      !relKey.includes('.pnpm/')
    ) {
      return relKey;
    }
    const abs = path.resolve(this.#baseDir, relKey);
    const realAbs = await this.#realpath(abs);
    let best: ModuleMapEntry | undefined;
    for (const entry of moduleMap) {
      if (realAbs === entry.realDir || realAbs.startsWith(entry.realDir + path.sep)) {
        best = entry;
        break;
      }
    }
    if (!best) {
      debug('normalize: no match for %o (real=%o)', relKey, realAbs);
      return relKey;
    }
    const rest = realAbs === best.realDir ? '' : realAbs.slice(best.realDir.length + 1);
    const normalized = [best.normalizedDir, rest].filter(Boolean).join('/').replaceAll(path.sep, '/');
    return normalized;
  }

  async #normalizeExtensions(
    extensions: Record<string, unknown> = {},
    moduleMap: ModuleMapEntry[],
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = { ...extensions };
    const tegg = extensions?.tegg as TeggManifestExtension | undefined;
    if (tegg?.moduleDescriptors) {
      result.tegg = {
        ...tegg,
        moduleDescriptors: await Promise.all(
          tegg.moduleDescriptors.map(async (desc) => {
            if (!path.isAbsolute(desc.unitPath)) return desc;
            const real = await this.#realpath(desc.unitPath);
            let best: ModuleMapEntry | undefined;
            for (const entry of moduleMap) {
              if (real === entry.realDir || real.startsWith(entry.realDir + path.sep)) {
                best = entry;
                break;
              }
            }
            if (!best) {
              // keep as relative-to-baseDir form so runtime can resolve via #resolveFromBase
              const rel = path.relative(this.#baseDir, real).replaceAll(path.sep, '/');
              return { ...desc, unitPath: rel };
            }
            const rest = real === best.realDir ? '' : real.slice(best.realDir.length + 1);
            const unitPath = [best.normalizedDir, rest].filter(Boolean).join('/').replaceAll(path.sep, '/');
            return { ...desc, unitPath };
          }),
        ),
      };
    }
    return result;
  }

  async #buildModuleMap(): Promise<ModuleMapEntry[]> {
    const entries = new Map<string, string>();
    const seen = new Set<string>();

    const addPackageDeps = async (packageJsonPath: string, parentNormalizedDir: string): Promise<void> => {
      let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      try {
        pkg = JSON.parse(await fsp.readFile(packageJsonPath, 'utf-8'));
      } catch {
        return;
      }
      const req = createRequire(packageJsonPath);
      const depNames = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
      for (const name of depNames) {
        try {
          const depPkgJson = req.resolve(`${name}/package.json`);
          const realDir = await this.#realpath(path.dirname(depPkgJson));
          if (seen.has(realDir)) continue;
          seen.add(realDir);
          const normalizedDir = [parentNormalizedDir, 'node_modules', name].filter(Boolean).join('/');
          if (!entries.has(realDir)) entries.set(realDir, normalizedDir);
          await addPackageDeps(depPkgJson, normalizedDir);
        } catch {
          /* dep not resolvable (optional/peer); skip */
        }
      }
    };

    await addPackageDeps(path.join(this.#baseDir, 'package.json'), '');
    const frameworkDir = this.#resolveFrameworkPath();
    const frameworkNormalizedDir = entries.get(await this.#realpath(frameworkDir)) ?? '';
    await addPackageDeps(path.join(frameworkDir, 'package.json'), frameworkNormalizedDir);

    return Array.from(entries, ([realDir, normalizedDir]) => ({ realDir, normalizedDir })).sort(
      (a, b) => b.realDir.length - a.realDir.length,
    );
  }

  async #realpath(filepath: string): Promise<string> {
    const cached = this.#realpathCache.get(filepath);
    if (cached) return cached;
    let resolved: string;
    try {
      resolved = await fsp.realpath(filepath);
    } catch {
      resolved = filepath;
    }
    this.#realpathCache.set(filepath, resolved);
    return resolved;
  }
}
