import fs, { type Stats } from 'node:fs';
import path from 'node:path';

import { RealLoaderFS, type LoaderFS, type LoaderFSGlobOptions } from '@eggjs/loader-fs';
import type {} from '@eggjs/typings/global';
import multimatch, { type Options as MultimatchOptions } from 'multimatch';

import type { ManifestStore } from './manifest.ts';

export { RealLoaderFS };
export type { LoaderFS, LoaderFSGlobOptions };

export class ManifestLoaderFS implements LoaderFS {
  readonly #manifest: ManifestStore;
  readonly #fallback: LoaderFS;
  readonly #manifestFiles: Set<string>;
  readonly #manifestDirectories: Set<string>;
  readonly #resolveCacheTargets: Set<string>;

  constructor(manifest: ManifestStore, fallback: LoaderFS = new RealLoaderFS()) {
    this.#manifest = manifest;
    this.#fallback = fallback;
    this.#resolveCacheTargets = new Set(
      Object.values(manifest.data.resolveCache).filter((target): target is string => typeof target === 'string'),
    );

    const manifestFiles = new Set<string>();
    const manifestDirectories = new Set<string>();
    for (const [dir, files] of Object.entries(manifest.data.fileDiscovery)) {
      addManifestDirectory(manifestDirectories, dir);
      for (const file of files) {
        const fullRel = path.posix.join(dir, file);
        manifestFiles.add(fullRel);
        addManifestDirectory(manifestDirectories, path.posix.dirname(fullRel));
      }
    }
    for (const target of this.#resolveCacheTargets) {
      manifestFiles.add(target);
      addManifestDirectory(manifestDirectories, path.posix.dirname(target));
    }
    this.#manifestFiles = manifestFiles;
    this.#manifestDirectories = manifestDirectories;
  }

  exists(filepath: string): boolean {
    const entry = this.#getManifestEntry(filepath);
    if (entry) {
      return entry.type !== 'missing';
    }
    return this.#fallback.exists(filepath);
  }

  stat(filepath: string): Stats {
    const entry = this.#getManifestEntry(filepath);
    if (entry?.type === 'file' || entry?.type === 'directory') {
      return createVirtualStats(entry.type);
    }
    if (entry?.type === 'missing') {
      throw createNotFoundError('stat', filepath);
    }
    return this.#fallback.stat(filepath);
  }

  realpath(filepath: string): string {
    const entry = this.#getManifestEntry(filepath);
    if (entry?.type === 'file' || entry?.type === 'directory') {
      return this.#toAbsolute(entry.rel);
    }
    if (entry?.type === 'missing') {
      throw createNotFoundError('realpath', filepath);
    }
    return this.#fallback.realpath(filepath);
  }

  readJSON<T = unknown>(filepath: string): T {
    const entry = this.#getManifestEntry(filepath);
    if (entry?.type === 'file') {
      const bundled = this.#loadBundledModule(entry.rel);
      if (bundled !== undefined) {
        return unwrapDefaultExport(bundled) as T;
      }
    }
    if (entry?.type === 'missing') {
      throw createNotFoundError('open', filepath);
    }
    return this.#fallback.readJSON(filepath);
  }

  glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
    const cwd = options?.cwd === undefined ? process.cwd() : String(options.cwd);
    const absoluteCwd = path.resolve(cwd);
    const cwdRel = this.#toRelative(absoluteCwd);
    const manifestFiles = this.#listManifestFilesUnder(cwdRel);
    if (manifestFiles === undefined) {
      return this.#fallback.glob(patterns, options);
    }

    const matched = filterManifestGlob(manifestFiles, patterns, options);
    if (options?.absolute) {
      return matched.map((file) => path.join(absoluteCwd, file));
    }
    return matched;
  }

  async loadFile(filepath: string): Promise<unknown> {
    const entry = this.#getManifestEntry(filepath);
    if (entry?.type === 'file') {
      const bundled = this.#loadBundledModule(entry.rel);
      if (bundled !== undefined) {
        return unwrapDefaultExport(bundled);
      }
    }
    if (entry?.type === 'missing') {
      throw createNotFoundError('open', filepath);
    }
    return this.#fallback.loadFile(filepath);
  }

  #getManifestEntry(filepath: string): ManifestEntry | undefined {
    const rel = this.#toRelative(filepath);
    const resolved = this.#resolveManifestFile(rel);
    if (resolved?.type === 'file') {
      return { type: 'file', rel: resolved.rel };
    }
    if (resolved?.type === 'missing') {
      return { type: 'missing', rel };
    }
    if (this.#isManifestDirectory(rel)) {
      return { type: 'directory', rel };
    }
  }

  #resolveManifestFile(rel: string): ManifestFileResolution | undefined {
    const cache = this.#manifest.data.resolveCache;
    if (Object.hasOwn(cache, rel)) {
      const cached = cache[rel];
      return cached === null ? { type: 'missing' } : { type: 'file', rel: cached };
    }

    if (this.#isManifestFile(rel)) {
      return { type: 'file', rel };
    }

    const discovered = this.#resolveFromFileDiscovery(rel);
    if (discovered) {
      return { type: 'file', rel: discovered };
    }
  }

  #resolveFromFileDiscovery(rel: string): string | undefined {
    const matchedDir = this.#nearestManifestDiscoveryDir(rel);
    if (matchedDir === undefined || rel === matchedDir) return;

    const request = matchedDir === '' ? rel : rel.slice(matchedDir.length + 1);
    for (const file of this.#manifest.data.fileDiscovery[matchedDir]) {
      if (file === request) {
        return path.posix.join(matchedDir, file);
      }

      const ext = path.posix.extname(file);
      if (!ext || ext === '.map') continue;

      const extensionlessFile = file.slice(0, -ext.length);
      if (extensionlessFile === request || extensionlessFile === `${request}/index`) {
        return path.posix.join(matchedDir, file);
      }
    }
  }

  #nearestManifestDiscoveryDir(rel: string): string | undefined {
    let current = path.posix.dirname(rel);
    while (true) {
      const dir = current === '.' ? '' : current;
      if (Object.hasOwn(this.#manifest.data.fileDiscovery, dir)) {
        return dir;
      }
      if (dir === '') return;
      current = path.posix.dirname(dir);
    }
  }

  #isManifestFile(rel: string): boolean {
    return this.#manifestFiles.has(rel);
  }

  #isManifestDirectory(rel: string): boolean {
    return this.#manifestDirectories.has(rel);
  }

  #listManifestFilesUnder(cwdRel: string): string[] | undefined {
    if (!this.#isManifestDirectory(cwdRel)) return;

    const files = new Set<string>();
    for (const [dir, entries] of Object.entries(this.#manifest.data.fileDiscovery)) {
      const prefix = dir === cwdRel ? '' : relativePrefix(cwdRel, dir);
      if (prefix === undefined) continue;
      for (const entry of entries) {
        files.add(path.posix.join(prefix, entry));
      }
    }

    for (const target of Object.values(this.#manifest.data.resolveCache)) {
      if (!target) continue;
      const prefix = relativePrefix(cwdRel, path.posix.dirname(target));
      if (prefix !== undefined) {
        files.add(path.posix.join(prefix, path.posix.basename(target)));
      }
    }
    return [...files].sort();
  }

  #loadBundledModule(rel: string): unknown {
    const loader = globalThis.__EGG_BUNDLE_MODULE_LOADER__;
    if (!loader) return undefined;

    for (const key of this.#bundleKeys(rel)) {
      const loaded = loader(key);
      if (loaded !== undefined) {
        return loaded;
      }
    }
  }

  #bundleKeys(rel: string): string[] {
    const abs = this.#toAbsolute(rel);
    return [...new Set([rel, normalizePath(abs)])];
  }

  #toRelative(filepath: string): string {
    const rel = path.relative(this.#manifest.baseDir, path.resolve(filepath));
    return normalizePath(rel);
  }

  #toAbsolute(rel: string): string {
    return path.isAbsolute(rel) ? rel : path.join(this.#manifest.baseDir, rel);
  }
}

interface ManifestEntry {
  type: 'file' | 'directory' | 'missing';
  rel: string;
}

type ManifestFileResolution = { type: 'file'; rel: string } | { type: 'missing' };

function normalizePath(filepath: string): string {
  return filepath.replaceAll(path.sep, '/');
}

function addManifestDirectory(directories: Set<string>, dir: string): void {
  let current = dir === '.' ? '' : dir;
  while (true) {
    directories.add(current);
    if (current === '') return;
    const parent = path.posix.dirname(current);
    current = parent === '.' ? '' : parent;
  }
}

function relativePrefix(cwdRel: string, dirRel: string): string | undefined {
  if (cwdRel === '') return dirRel;
  if (dirRel === cwdRel) return '';
  if (dirRel.startsWith(cwdRel + '/')) return dirRel.slice(cwdRel.length + 1);
}

function filterManifestGlob(files: string[], patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
  const patternList = Array.isArray(patterns) ? patterns : [patterns];
  if (!patternList.some((pattern) => !pattern.startsWith('!'))) return [];

  const ignoreList = Array.isArray(options?.ignore)
    ? options.ignore.map(String)
    : options?.ignore
      ? [String(options.ignore)]
      : [];
  const normalizedPatterns = patternList
    .map(normalizeAlternationGroups)
    .concat(ignoreList.map((pattern) => `!${normalizeAlternationGroups(pattern)}`));
  return multimatch(files, normalizedPatterns, toMultimatchOptions(options));
}

function toMultimatchOptions(options?: LoaderFSGlobOptions): MultimatchOptions {
  return {
    ...(options?.dot !== undefined ? { dot: options.dot } : {}),
    ...(options?.caseSensitiveMatch !== undefined ? { nocase: !options.caseSensitiveMatch } : {}),
    ...(options?.braceExpansion !== undefined ? { nobrace: !options.braceExpansion } : {}),
    ...(options?.extglob !== undefined ? { noext: !options.extglob } : {}),
    ...(options?.globstar !== undefined ? { noglobstar: !options.globstar } : {}),
    ...(options?.baseNameMatch !== undefined ? { matchBase: options.baseNameMatch } : {}),
  };
}

function normalizeAlternationGroups(pattern: string): string {
  let normalized = '';
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char !== '(' || isExtglobPrefix(pattern[index - 1])) {
      normalized += char;
      continue;
    }

    const end = pattern.indexOf(')', index + 1);
    if (end === -1) {
      normalized += char;
      continue;
    }

    const group = pattern.slice(index + 1, end);
    if (group.includes('|')) {
      normalized += `{${group.replaceAll('|', ',')}}`;
      index = end;
    } else {
      normalized += char;
    }
  }
  return normalized;
}

function isExtglobPrefix(char: string | undefined): boolean {
  return char === '@' || char === '!' || char === '?' || char === '+' || char === '*';
}

function unwrapDefaultExport(value: unknown): unknown {
  let unwrapped = value;
  if (isRecord(unwrapped) && isRecord(unwrapped.default) && unwrapped.default.__esModule === true) {
    unwrapped = unwrapped.default;
  }
  if (isRecord(unwrapped) && 'default' in unwrapped) {
    return unwrapped.default;
  }
  return unwrapped;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function createVirtualStats(type: 'file' | 'directory'): Stats {
  const stat = Object.create(fs.Stats.prototype) as Stats;
  const isFile = type === 'file';
  const timestamp = new Date(0);
  Object.defineProperties(stat, {
    size: { value: 0 },
    atimeMs: { value: 0 },
    mtimeMs: { value: 0 },
    ctimeMs: { value: 0 },
    birthtimeMs: { value: 0 },
    atime: { value: timestamp },
    mtime: { value: timestamp },
    ctime: { value: timestamp },
    birthtime: { value: timestamp },
    isFile: { value: () => isFile },
    isDirectory: { value: () => !isFile },
    isSymbolicLink: { value: () => false },
  });
  return stat;
}

function createNotFoundError(syscall: string, filepath: string): NodeJS.ErrnoException {
  const err = new Error(`ENOENT: no such file or directory, ${syscall} '${filepath}'`) as NodeJS.ErrnoException;
  err.code = 'ENOENT';
  err.errno = -2;
  err.syscall = syscall;
  err.path = filepath;
  return err;
}
