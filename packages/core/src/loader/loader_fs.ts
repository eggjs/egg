import fs, { type Stats } from 'node:fs';
import path from 'node:path';

import { RealLoaderFS, type LoaderFS, type LoaderFSGlobOptions } from '@eggjs/loader-fs';
import type {} from '@eggjs/typings/global';
import multimatch from 'multimatch';

import type { ManifestStore } from './manifest.ts';

export { RealLoaderFS };
export type { LoaderFS, LoaderFSGlobOptions };

export class ManifestLoaderFS implements LoaderFS {
  readonly #manifest: ManifestStore;
  readonly #fallback: LoaderFS;

  constructor(manifest: ManifestStore, fallback: LoaderFS = new RealLoaderFS()) {
    this.#manifest = manifest;
    this.#fallback = fallback;
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
    let matchedDir: string | undefined;
    for (const dir of Object.keys(this.#manifest.data.fileDiscovery)) {
      if ((rel === dir || rel.startsWith(dir + '/')) && (!matchedDir || dir.length > matchedDir.length)) {
        matchedDir = dir;
      }
    }
    if (!matchedDir || rel === matchedDir) return;

    const request = rel.slice(matchedDir.length + 1);
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

  #isManifestFile(rel: string): boolean {
    for (const [dir, files] of Object.entries(this.#manifest.data.fileDiscovery)) {
      const file = relativeFileUnderDir(dir, rel);
      if (file !== undefined && files.includes(file)) {
        return true;
      }
    }
    return Object.values(this.#manifest.data.resolveCache).includes(rel);
  }

  #isManifestDirectory(rel: string): boolean {
    if (rel === '') {
      return this.#hasManifestData();
    }
    if (Object.hasOwn(this.#manifest.data.fileDiscovery, rel)) {
      return true;
    }

    for (const [dir, files] of Object.entries(this.#manifest.data.fileDiscovery)) {
      if (dir.startsWith(rel + '/')) {
        return true;
      }
      for (const file of files) {
        const fullRel = path.posix.join(dir, file);
        if (path.posix.dirname(fullRel) === rel || fullRel.startsWith(rel + '/')) {
          return true;
        }
      }
    }

    for (const target of Object.values(this.#manifest.data.resolveCache)) {
      if (target && (path.posix.dirname(target) === rel || target.startsWith(rel + '/'))) {
        return true;
      }
    }
    return false;
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

  #hasManifestData(): boolean {
    return (
      Object.keys(this.#manifest.data.fileDiscovery).length > 0 ||
      Object.keys(this.#manifest.data.resolveCache).some((key) => this.#manifest.data.resolveCache[key] !== null)
    );
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

function relativePrefix(cwdRel: string, dirRel: string): string | undefined {
  if (cwdRel === '') return dirRel;
  if (dirRel === cwdRel) return '';
  if (dirRel.startsWith(cwdRel + '/')) return dirRel.slice(cwdRel.length + 1);
}

function relativeFileUnderDir(dirRel: string, fileRel: string): string | undefined {
  if (dirRel === '') return fileRel;
  if (fileRel.startsWith(dirRel + '/')) return fileRel.slice(dirRel.length + 1);
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
  return multimatch(files, normalizedPatterns);
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
