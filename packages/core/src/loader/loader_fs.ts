import fs, { type Stats } from 'node:fs';
import path from 'node:path';

import globby from 'globby';
import { readJSONSync } from 'utility';

import utils from '../utils/index.ts';
import type { ManifestStore } from './manifest.ts';

export type LoaderFSGlobOptions = globby.GlobbyOptions;

export interface LoaderFS {
  exists(filepath: string): boolean;
  stat(filepath: string): Stats;
  realpath(filepath: string): string;
  readFile?: LoaderFSReadFile;
  readJSON<T = unknown>(filepath: string): T;
  glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[];
  loadFile(filepath: string): Promise<unknown>;
}

export interface LoaderFSReadFile {
  (filepath: string): Buffer;
  (filepath: string, encoding: BufferEncoding): string;
}

export function readFileWithLoaderFS(loaderFS: LoaderFS, filepath: string): Buffer;
export function readFileWithLoaderFS(loaderFS: LoaderFS, filepath: string, encoding: BufferEncoding): string;
export function readFileWithLoaderFS(loaderFS: LoaderFS, filepath: string, encoding?: BufferEncoding): Buffer | string {
  if (loaderFS.readFile) {
    return encoding ? loaderFS.readFile(filepath, encoding) : loaderFS.readFile(filepath);
  }
  return encoding ? fs.readFileSync(filepath, encoding) : fs.readFileSync(filepath);
}

export class RealLoaderFS implements LoaderFS {
  exists(filepath: string): boolean {
    return fs.existsSync(filepath);
  }

  stat(filepath: string): Stats {
    return fs.statSync(filepath);
  }

  realpath(filepath: string): string {
    return fs.realpathSync(filepath);
  }

  readFile(filepath: string): Buffer;
  readFile(filepath: string, encoding: BufferEncoding): string;
  readFile(filepath: string, encoding?: BufferEncoding): Buffer | string {
    return encoding ? fs.readFileSync(filepath, encoding) : fs.readFileSync(filepath);
  }

  readJSON<T = unknown>(filepath: string): T {
    return readJSONSync(filepath) as T;
  }

  glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
    return globby.sync(patterns, options);
  }

  async loadFile(filepath: string): Promise<unknown> {
    return utils.loadFile(filepath);
  }
}

export class ManifestLoaderFS implements LoaderFS {
  readonly #baseDir: string;
  readonly #manifest: ManifestStore;
  readonly #delegate: LoaderFS;
  readonly #knownFiles = new Set<string>();
  readonly #knownDirs = new Set<string>();

  constructor(baseDir: string, manifest: ManifestStore, delegate: LoaderFS = new RealLoaderFS()) {
    this.#baseDir = baseDir;
    this.#manifest = manifest;
    this.#delegate = delegate;
    this.#indexManifestPaths();
  }

  exists(filepath: string): boolean {
    if (this.#bundleFileText(filepath) !== undefined || this.#isManifestKnown(filepath)) return true;
    return this.#delegate.exists(filepath);
  }

  stat(filepath: string): Stats {
    const type = this.#manifestEntryType(filepath);
    if (type) return this.#syntheticStats(type);
    return this.#delegate.stat(filepath);
  }

  realpath(filepath: string): string {
    if (this.#bundleFileText(filepath) !== undefined || this.#isManifestKnown(filepath)) return filepath;
    return this.#delegate.realpath(filepath);
  }

  readFile(filepath: string): Buffer;
  readFile(filepath: string, encoding: BufferEncoding): string;
  readFile(filepath: string, encoding?: BufferEncoding): Buffer | string {
    const text = this.#bundleFileText(filepath);
    if (text !== undefined) {
      return encoding ? Buffer.from(text).toString(encoding) : Buffer.from(text);
    }
    return encoding
      ? readFileWithLoaderFS(this.#delegate, filepath, encoding)
      : readFileWithLoaderFS(this.#delegate, filepath);
  }

  readJSON<T = unknown>(filepath: string): T {
    const text = this.#bundleFileText(filepath);
    if (text !== undefined) return JSON.parse(text) as T;
    return this.#delegate.readJSON<T>(filepath);
  }

  glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
    return this.#delegate.glob(patterns, options);
  }

  async loadFile(filepath: string): Promise<unknown> {
    const normalized = this.#normalize(filepath);
    const bundleHit = globalThis.__EGG_BUNDLE_MODULE_LOADER__?.(normalized);
    if (bundleHit !== undefined) return this.#unwrapDefault(bundleHit);

    const text = this.#bundleFileText(filepath);
    if (text !== undefined) {
      return path.extname(filepath) === '.json' ? JSON.parse(text) : Buffer.from(text);
    }

    return this.#delegate.loadFile(filepath);
  }

  #bundleFileText(filepath: string): string | undefined {
    const loader = globalThis.__EGG_BUNDLE_FILE_LOADER__;
    if (!loader) return;
    const normalized = this.#normalize(filepath);
    const direct = loader(normalized);
    if (direct !== undefined) return direct;

    const rel = this.#toRelative(filepath);
    return rel === normalized ? undefined : loader(rel);
  }

  #isManifestKnown(filepath: string): boolean {
    return this.#manifestEntryType(filepath) !== undefined;
  }

  #manifestEntryType(filepath: string): 'file' | 'directory' | undefined {
    if (this.#bundleFileText(filepath) !== undefined) return 'file';

    const rel = this.#toRelative(filepath);
    if (this.#knownDirs.has(rel)) return 'directory';
    if (this.#knownFiles.has(rel)) return 'file';
  }

  #syntheticStats(type: 'file' | 'directory'): Stats {
    const mode = type === 'directory' ? 0o040755 : 0o100644;
    const time = new Date(0);
    return {
      dev: 0,
      ino: 0,
      mode,
      nlink: 1,
      uid: 0,
      gid: 0,
      rdev: 0,
      size: 0,
      blksize: 4096,
      blocks: 0,
      atimeMs: 0,
      mtimeMs: 0,
      ctimeMs: 0,
      birthtimeMs: 0,
      atime: time,
      mtime: time,
      ctime: time,
      birthtime: time,
      isFile: () => type === 'file',
      isDirectory: () => type === 'directory',
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    } as Stats;
  }

  #indexManifestPaths(): void {
    this.#addKnownDir('');

    for (const [dir, files] of Object.entries(this.#manifest.data.fileDiscovery)) {
      const normalizedDir = this.#normalize(dir);
      this.#addKnownDir(normalizedDir);
      for (const file of files) {
        this.#addKnownFile(path.posix.join(normalizedDir, this.#normalize(file)));
      }
    }

    for (const value of Object.values(this.#manifest.data.resolveCache)) {
      if (value) this.#addKnownFile(this.#normalize(value));
    }
  }

  #addKnownFile(rel: string): void {
    this.#knownFiles.add(rel);
    this.#addKnownDir(path.posix.dirname(rel));
  }

  #addKnownDir(rel: string): void {
    if (rel === '.' || rel === '/') rel = '';

    let current = rel;
    while (true) {
      this.#knownDirs.add(current);
      const parent = path.posix.dirname(current);
      if (parent === current || parent === '.') {
        this.#knownDirs.add('');
        break;
      }
      current = parent;
    }
  }

  #toRelative(filepath: string): string {
    const rel = path.isAbsolute(filepath) ? path.relative(this.#baseDir, filepath) : filepath;
    return this.#normalize(rel);
  }

  #normalize(filepath: string): string {
    return filepath.split(path.win32.sep).join(path.posix.sep);
  }

  #unwrapDefault(obj: unknown): unknown {
    if (obj && typeof obj === 'object' && 'default' in obj && (obj as { default?: unknown }).default !== undefined) {
      return (obj as { default: unknown }).default;
    }
    return obj;
  }
}
