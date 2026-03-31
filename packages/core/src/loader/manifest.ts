import { createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { debuglog } from 'node:util';

import { isSupportTypeScript } from '@eggjs/utils';

const debug = debuglog('egg/core/loader/manifest');

const MANIFEST_VERSION = 1;

const LOCKFILE_NAMES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'] as const;

export interface ManifestInvalidation {
  lockfileFingerprint: string;
  configFingerprint: string;
  serverEnv: string;
  serverScope: string;
  typescriptEnabled: boolean;
}

export interface StartupManifest {
  version: number;
  generatedAt: string;
  invalidation: ManifestInvalidation;
  /** Plugin-specific manifest data, keyed by plugin name */
  extensions: Record<string, unknown>;
  /** resolveModule cache: relative filepath -> resolved relative path | null */
  resolveCache: Record<string, string | null>;
  /** relative directory path -> file relative paths */
  fileDiscovery: Record<string, string[]>;
}

export class ManifestStore {
  readonly data: StartupManifest;
  readonly baseDir: string;

  // Collectors for manifest generation (populated during loading)
  readonly #resolveCacheCollector: Record<string, string | null> = {};
  readonly #fileDiscoveryCollector: Record<string, string[]> = {};
  readonly #extensionCollector: Record<string, unknown> = {};

  private constructor(data: StartupManifest, baseDir: string) {
    this.data = data;
    this.baseDir = baseDir;
  }

  // --- Factory Methods ---

  /**
   * Load and validate manifest from `.egg/manifest.json`.
   * Returns null if manifest doesn't exist or is invalid.
   */
  static load(baseDir: string, serverEnv: string, serverScope: string): ManifestStore | null {
    if (serverEnv === 'local' && process.env.EGG_MANIFEST !== 'true') {
      debug('skip manifest in local env (set EGG_MANIFEST=true to enable)');
      return null;
    }

    const manifestPath = path.join(baseDir, '.egg', 'manifest.json');
    let raw: string;
    try {
      raw = fs.readFileSync(manifestPath, 'utf-8');
    } catch {
      debug('manifest not found at %s', manifestPath);
      return null;
    }

    let data: StartupManifest;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      debug('failed to parse manifest: %s', e);
      return null;
    }

    if (!ManifestStore.#validate(data, baseDir, serverEnv, serverScope)) {
      return null;
    }

    debug('manifest loaded successfully');
    return new ManifestStore(data, baseDir);
  }

  /**
   * Create a collector-only ManifestStore (no cached data).
   * Used during normal startup to collect data for future manifest generation.
   */
  static createCollector(baseDir: string): ManifestStore {
    const emptyData: StartupManifest = {
      version: MANIFEST_VERSION,
      generatedAt: '',
      invalidation: {
        lockfileFingerprint: '',
        configFingerprint: '',
        serverEnv: '',
        serverScope: '',
        typescriptEnabled: false,
      },
      extensions: {},
      resolveCache: {},
      fileDiscovery: {},
    };
    return new ManifestStore(emptyData, baseDir);
  }

  static #validate(data: StartupManifest, baseDir: string, serverEnv: string, serverScope: string): boolean {
    if (data.version !== MANIFEST_VERSION) {
      debug('manifest version mismatch: expected %d, got %d', MANIFEST_VERSION, data.version);
      return false;
    }

    const inv = data.invalidation;
    if (!inv) {
      debug('manifest missing invalidation data');
      return false;
    }

    if (inv.serverEnv !== serverEnv) {
      debug('manifest serverEnv mismatch: expected %s, got %s', serverEnv, inv.serverEnv);
      return false;
    }

    if (inv.serverScope !== serverScope) {
      debug('manifest serverScope mismatch: expected %s, got %s', serverScope, inv.serverScope);
      return false;
    }

    const currentTypescriptEnabled = isSupportTypeScript();
    if (inv.typescriptEnabled !== currentTypescriptEnabled) {
      debug(
        'manifest typescriptEnabled mismatch: expected %s, got %s',
        currentTypescriptEnabled,
        inv.typescriptEnabled,
      );
      return false;
    }

    const currentLockfileFingerprint = ManifestStore.#lockfileFingerprint(baseDir);
    if (inv.lockfileFingerprint !== currentLockfileFingerprint) {
      debug('manifest lockfileFingerprint mismatch');
      return false;
    }

    const currentConfigFingerprint = ManifestStore.#directoryFingerprint(path.join(baseDir, 'config'));
    if (inv.configFingerprint !== currentConfigFingerprint) {
      debug('manifest configFingerprint mismatch');
      return false;
    }

    return true;
  }

  // --- High-level APIs (cache + collect) ---

  /**
   * Resolve a module path. Checks cache first, falls back to resolver, collects result.
   */
  resolveModule(filepath: string, fallback: () => string | undefined): string | undefined {
    const relKey = this.#toRelative(filepath);
    const cache = this.data.resolveCache;
    if (cache && relKey in cache) {
      const cached = cache[relKey];
      debug('[resolveModule:manifest] %o => %o', filepath, cached);
      return cached !== null ? this.#toAbsolute(cached) : undefined;
    }

    const result = fallback();
    this.#resolveCacheCollector[relKey] = result !== undefined ? this.#toRelative(result) : null;
    return result;
  }

  /**
   * Get file list for a directory. Checks cache first, falls back to globber, collects result.
   */
  globFiles(directory: string, fallback: () => string[]): string[] {
    const relKey = this.#toRelative(directory);
    const cache = this.data.fileDiscovery;
    if (cache && relKey in cache) {
      const cached = cache[relKey];
      debug('[globFiles:manifest] using cached files for %o, count: %d', directory, cached.length);
      return cached;
    }

    const result = fallback();
    this.#fileDiscoveryCollector[relKey] = result;
    return result;
  }

  /**
   * Look up a plugin extension by name.
   */
  getExtension(name: string): unknown {
    return this.data.extensions?.[name];
  }

  /**
   * Register plugin extension data for manifest generation.
   */
  setExtension(name: string, data: unknown): void {
    this.#extensionCollector[name] = data;
  }

  // --- Generation APIs ---

  /**
   * Generate a StartupManifest from collected data.
   */
  generateManifest(options: ManifestGenerateOptions): StartupManifest {
    return {
      version: MANIFEST_VERSION,
      generatedAt: new Date().toISOString(),
      invalidation: {
        lockfileFingerprint: ManifestStore.#lockfileFingerprint(this.baseDir),
        configFingerprint: ManifestStore.#directoryFingerprint(path.join(this.baseDir, 'config')),
        serverEnv: options.serverEnv,
        serverScope: options.serverScope,
        typescriptEnabled: options.typescriptEnabled,
      },
      extensions: this.#extensionCollector,
      resolveCache: this.#resolveCacheCollector,
      fileDiscovery: this.#fileDiscoveryCollector,
    };
  }

  static async write(baseDir: string, manifest: StartupManifest): Promise<void> {
    const dir = path.join(baseDir, '.egg');
    await fsp.mkdir(dir, { recursive: true });
    const manifestPath = path.join(dir, 'manifest.json');
    await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    debug('manifest written to %s', manifestPath);
  }

  static clean(baseDir: string): void {
    const manifestPath = path.join(baseDir, '.egg', 'manifest.json');
    try {
      fs.unlinkSync(manifestPath);
      debug('manifest removed: %s', manifestPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  // --- Path Utilities ---

  #toRelative(absPath: string): string {
    const rel = path.isAbsolute(absPath) ? path.relative(this.baseDir, absPath) : absPath;
    return rel.replaceAll(path.sep, '/');
  }

  #toAbsolute(relPath: string): string {
    if (path.isAbsolute(relPath)) {
      return relPath;
    }
    return path.join(this.baseDir, relPath);
  }

  // --- Fingerprint Utilities ---

  static #statFingerprint(filepath: string): string | null {
    try {
      const stat = fs.statSync(filepath);
      return `${stat.mtimeMs}:${stat.size}`;
    } catch {
      return null;
    }
  }

  static #lockfileFingerprint(baseDir: string): string {
    for (const name of LOCKFILE_NAMES) {
      const fp = ManifestStore.#statFingerprint(path.join(baseDir, name));
      if (fp) return `${name}:${fp}`;
    }
    return '';
  }

  static #directoryFingerprint(dirpath: string): string {
    const hash = createHash('md5');
    const visited = new Set<string>();
    ManifestStore.#fingerprintRecursive(dirpath, hash, visited);
    return hash.digest('hex');
  }

  static #fingerprintRecursive(dirpath: string, hash: ReturnType<typeof createHash>, visited: Set<string>): void {
    let realPath: string;
    try {
      realPath = fs.realpathSync(dirpath);
    } catch {
      return;
    }
    if (visited.has(realPath)) return;
    visited.add(realPath);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirpath, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(dirpath, entry.name);
      if (entry.isDirectory()) {
        hash.update(`dir:${entry.name}\n`);
        ManifestStore.#fingerprintRecursive(fullPath, hash, visited);
      } else if (entry.isFile()) {
        const fp = ManifestStore.#statFingerprint(fullPath);
        hash.update(`file:${entry.name}:${fp ?? 'missing'}\n`);
      }
    }
  }
}

export interface ManifestGenerateOptions {
  serverEnv: string;
  serverScope: string;
  typescriptEnabled: boolean;
}
