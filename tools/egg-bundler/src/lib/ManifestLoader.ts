import { fork } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { debuglog } from 'node:util';

import { ManifestStore, type StartupManifest } from '@eggjs/core';

const debug = debuglog('egg/bundler/manifest-loader');

const SUPPORTED_MANIFEST_VERSION = 1;
const FRAMEWORK_DEFAULT = 'egg';

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
  pkgName: string;
}

export class ManifestLoader {
  readonly #baseDir: string;
  readonly #manifestPath: string;
  readonly #autoGenerate: boolean;
  readonly #env: string | undefined;
  readonly #scope: string | undefined;
  readonly #framework: string;
  readonly #execArgv: string[] | undefined;
  #manifest: StartupManifest | undefined;
  #store: ManifestStore | undefined;

  constructor(options: ManifestLoaderOptions) {
    this.#baseDir = options.baseDir;
    this.#manifestPath = options.manifestPath ?? path.join(options.baseDir, '.egg', 'manifest.json');
    this.#autoGenerate = options.autoGenerate ?? true;
    this.#env = options.env;
    this.#scope = options.scope;
    this.#framework = options.framework ?? FRAMEWORK_DEFAULT;
    this.#execArgv = options.execArgv;
  }

  async load(): Promise<StartupManifest> {
    if (this.#manifest) return this.#manifest;

    let data = this.#readFromDisk();
    if (!data) {
      if (!this.#autoGenerate) {
        throw new Error(`[@eggjs/egg-bundler] manifest not found at ${this.#manifestPath}`);
      }
      await this.#generate();
      data = this.#readFromDisk();
      if (!data) {
        throw new Error(`[@eggjs/egg-bundler] manifest generation did not produce ${this.#manifestPath}`);
      }
    }

    const normalized = this.#normalize(data);
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
      const req = createRequire(path.join(this.#baseDir, 'package.json'));
      const rest = rel.slice('node_modules/'.length);
      const slashIdx = rest.startsWith('@') ? rest.indexOf('/', rest.indexOf('/') + 1) : rest.indexOf('/');
      const pkgName = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
      const sub = slashIdx === -1 ? '' : rest.slice(slashIdx + 1);
      try {
        const pkgJson = req.resolve(`${pkgName}/package.json`);
        return path.resolve(path.dirname(pkgJson), sub);
      } catch {
        return path.resolve(this.#baseDir, rel);
      }
    }
    return path.resolve(this.#baseDir, rel);
  }

  #readFromDisk(): StartupManifest | undefined {
    let raw: string;
    try {
      raw = fs.readFileSync(this.#manifestPath, 'utf-8');
    } catch {
      return undefined;
    }
    const parsed = JSON.parse(raw) as StartupManifest;
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
    const payload = {
      baseDir: this.#baseDir,
      framework: this.#resolveFrameworkPath(),
      env: this.#env,
      scope: this.#scope,
    };
    debug('fork generate-manifest: %o', payload);

    await new Promise<void>((resolve, reject) => {
      const child = fork(scriptPath, [JSON.stringify(payload)], {
        stdio: 'inherit',
        execArgv: this.#execArgv ?? process.execArgv,
        env: {
          ...process.env,
          EGG_MANIFEST: 'true',
        },
      });
      child.on('exit', (code, signal) => {
        if (code === 0) resolve();
        else
          reject(
            new Error(`[@eggjs/egg-bundler] manifest generate subprocess exited with code=${code} signal=${signal}`),
          );
      });
      child.on('error', reject);
    });
  }

  #resolveFrameworkPath(): string {
    if (path.isAbsolute(this.#framework)) return this.#framework;
    try {
      const req = createRequire(path.join(this.#baseDir, 'package.json'));
      const pkgJson = req.resolve(`${this.#framework}/package.json`);
      return path.dirname(pkgJson);
    } catch {
      return this.#framework;
    }
  }

  // --- Key normalization ---

  #normalize(data: StartupManifest): StartupManifest {
    const moduleMap = this.#buildModuleMap();
    debug('moduleMap size: %d', moduleMap.length);

    const normalizedDiscovery: Record<string, string[]> = {};
    for (const [key, files] of Object.entries(data.fileDiscovery)) {
      const newKey = this.#normalizeRelKey(key, moduleMap);
      normalizedDiscovery[newKey] = files;
    }

    const normalizedResolveCache: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(data.resolveCache)) {
      const newKey = this.#normalizeRelKey(key, moduleMap);
      const newValue = value === null ? null : this.#normalizeRelKey(value, moduleMap);
      normalizedResolveCache[newKey] = newValue;
    }

    const normalizedExtensions = this.#normalizeExtensions(data.extensions, moduleMap);

    return {
      ...data,
      extensions: normalizedExtensions,
      fileDiscovery: normalizedDiscovery,
      resolveCache: normalizedResolveCache,
    };
  }

  #normalizeRelKey(relKey: string, moduleMap: ModuleMapEntry[]): string {
    if (!relKey) return relKey;
    // Already inside baseDir and not escaping — leave as-is.
    if (!relKey.startsWith('..') && !relKey.includes('node_modules/') && !relKey.includes('.pnpm/')) {
      return relKey;
    }
    const abs = path.resolve(this.#baseDir, relKey);
    let realAbs: string;
    try {
      realAbs = fs.realpathSync(abs);
    } catch {
      realAbs = abs;
    }
    // Longest-prefix match
    let best: ModuleMapEntry | undefined;
    for (const entry of moduleMap) {
      if (realAbs === entry.realDir || realAbs.startsWith(entry.realDir + path.sep)) {
        if (!best || entry.realDir.length > best.realDir.length) {
          best = entry;
        }
      }
    }
    if (!best) {
      debug('normalize: no match for %o (real=%o)', relKey, realAbs);
      return relKey;
    }
    const rest = realAbs === best.realDir ? '' : realAbs.slice(best.realDir.length + 1);
    const normalized = ['node_modules', best.pkgName, rest].filter(Boolean).join('/').replaceAll(path.sep, '/');
    return normalized;
  }

  #normalizeExtensions(extensions: Record<string, unknown>, moduleMap: ModuleMapEntry[]): Record<string, unknown> {
    const result: Record<string, unknown> = { ...extensions };
    const tegg = extensions?.tegg as TeggManifestExtension | undefined;
    if (tegg?.moduleDescriptors) {
      result.tegg = {
        ...tegg,
        moduleDescriptors: tegg.moduleDescriptors.map((desc) => {
          if (!path.isAbsolute(desc.unitPath)) return desc;
          let real: string;
          try {
            real = fs.realpathSync(desc.unitPath);
          } catch {
            real = desc.unitPath;
          }
          let best: ModuleMapEntry | undefined;
          for (const entry of moduleMap) {
            if (real === entry.realDir || real.startsWith(entry.realDir + path.sep)) {
              if (!best || entry.realDir.length > best.realDir.length) best = entry;
            }
          }
          if (!best) {
            // keep as relative-to-baseDir form so runtime can resolve via #resolveFromBase
            const rel = path.relative(this.#baseDir, real).replaceAll(path.sep, '/');
            return { ...desc, unitPath: rel };
          }
          const rest = real === best.realDir ? '' : real.slice(best.realDir.length + 1);
          const unitPath = ['node_modules', best.pkgName, rest].filter(Boolean).join('/');
          return { ...desc, unitPath };
        }),
      };
    }
    return result;
  }

  #buildModuleMap(): ModuleMapEntry[] {
    const entries = new Map<string, string>();
    const seenPkgs = new Set<string>();

    const addFromPackageJson = (packageJsonPath: string) => {
      let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      try {
        pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      } catch {
        return;
      }
      const req = createRequire(packageJsonPath);
      const depNames = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
      for (const name of depNames) {
        if (seenPkgs.has(name)) continue;
        seenPkgs.add(name);
        try {
          const depPkgJson = req.resolve(`${name}/package.json`);
          const realDir = fs.realpathSync(path.dirname(depPkgJson));
          if (!entries.has(realDir)) entries.set(realDir, name);
        } catch {
          /* dep not resolvable (optional/peer); skip */
        }
      }
    };

    addFromPackageJson(path.join(this.#baseDir, 'package.json'));
    const frameworkDir = this.#resolveFrameworkPath();
    addFromPackageJson(path.join(frameworkDir, 'package.json'));

    return Array.from(entries, ([realDir, pkgName]) => ({ realDir, pkgName })).sort(
      (a, b) => b.realDir.length - a.realDir.length,
    );
  }
}
