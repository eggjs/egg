import { createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { debuglog } from 'node:util';

const debug = debuglog('egg/core/loader/manifest');

const MANIFEST_VERSION = 1;

const LOCKFILE_NAMES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'] as const;

export interface ManifestModuleReference {
  name: string;
  path: string;
  optional?: boolean;
}

export interface ManifestModuleDescriptor {
  name: string;
  unitPath: string;
  optional?: boolean;
  /** Files containing decorated classes, relative to unitPath */
  decoratedFiles: string[];
}

export interface ManifestTegg {
  moduleReferences: ManifestModuleReference[];
  moduleDescriptors: ManifestModuleDescriptor[];
}

export interface ManifestInvalidation {
  lockfileFingerprint: string;
  configFingerprint: string;
  serverEnv: string;
  serverScope: string;
  baseDir: string;
  typescriptEnabled: boolean;
}

export interface StartupManifest {
  version: number;
  generatedAt: string;
  invalidation: ManifestInvalidation;
  tegg: ManifestTegg;
  /** resolveModule cache: filepath -> resolved path | null */
  resolveCache: Record<string, string | null>;
  /** directory path -> file relative paths (filtered) */
  fileDiscovery: Record<string, string[]>;
}

export class ManifestStore {
  readonly data: StartupManifest;

  private constructor(data: StartupManifest) {
    this.data = data;
  }

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
    return new ManifestStore(data);
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

    // Note: baseDir is NOT validated — build env and runtime env may have different paths

    if (inv.serverEnv !== serverEnv) {
      debug('manifest serverEnv mismatch: expected %s, got %s', serverEnv, inv.serverEnv);
      return false;
    }

    if (inv.serverScope !== serverScope) {
      debug('manifest serverScope mismatch: expected %s, got %s', serverScope, inv.serverScope);
      return false;
    }

    // Use stat-based fingerprint (mtime+size) for cheap validation
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

  // --- Query APIs ---

  getResolveCache(filepath: string): string | null | undefined {
    const cache = this.data.resolveCache;
    if (!cache || !(filepath in cache)) return undefined;
    return cache[filepath];
  }

  getFileDiscovery(directory: string): string[] | undefined {
    return this.data.fileDiscovery?.[directory];
  }

  get tegg(): ManifestTegg | undefined {
    return this.data.tegg;
  }

  // --- Generation APIs ---

  static generate(options: ManifestGenerateOptions): StartupManifest {
    return {
      version: MANIFEST_VERSION,
      generatedAt: new Date().toISOString(),
      invalidation: {
        lockfileFingerprint: ManifestStore.#lockfileFingerprint(options.baseDir),
        configFingerprint: ManifestStore.#directoryFingerprint(path.join(options.baseDir, 'config')),
        serverEnv: options.serverEnv,
        serverScope: options.serverScope,
        baseDir: options.baseDir,
        typescriptEnabled: options.typescriptEnabled,
      },
      tegg: options.tegg ?? { moduleReferences: [], moduleDescriptors: [] },
      resolveCache: options.resolveCache ?? {},
      fileDiscovery: options.fileDiscovery ?? {},
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
    } catch {
      // file doesn't exist, nothing to do
    }
  }

  // --- Fingerprint Utilities (stat-based, no content reads) ---

  /** Fingerprint a file by mtime+size — avoids reading file content. */
  static #statFingerprint(filepath: string): string | null {
    try {
      const stat = fs.statSync(filepath);
      return `${stat.mtimeMs}:${stat.size}`;
    } catch {
      return null;
    }
  }

  /** Find and fingerprint the project's lockfile. */
  static #lockfileFingerprint(baseDir: string): string {
    for (const name of LOCKFILE_NAMES) {
      const fp = ManifestStore.#statFingerprint(path.join(baseDir, name));
      if (fp) return `${name}:${fp}`;
    }
    return '';
  }

  /** Fingerprint a directory tree by file names, mtimes, and sizes. */
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
    // Prevent symlink cycles
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
        // Use stat metadata instead of reading file contents
        const fp = ManifestStore.#statFingerprint(fullPath);
        hash.update(`file:${entry.name}:${fp ?? 'missing'}\n`);
      }
    }
  }
}

export interface ManifestGenerateOptions {
  baseDir: string;
  serverEnv: string;
  serverScope: string;
  typescriptEnabled: boolean;
  tegg?: ManifestTegg;
  resolveCache?: Record<string, string | null>;
  fileDiscovery?: Record<string, string[]>;
}
