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
  readFile(filepath: string): Buffer;
  readFile(filepath: string, encoding: BufferEncoding): string;
  readJSON<T = unknown>(filepath: string): T;
  glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[];
  loadFile(filepath: string): Promise<unknown>;
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

  constructor(baseDir: string, manifest: ManifestStore, delegate: LoaderFS = new RealLoaderFS()) {
    this.#baseDir = baseDir;
    this.#manifest = manifest;
    this.#delegate = delegate;
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
      return encoding ? text : Buffer.from(text);
    }
    return encoding ? this.#delegate.readFile(filepath, encoding) : this.#delegate.readFile(filepath);
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
    if (text !== undefined) return Buffer.from(text);

    return this.#delegate.loadFile(filepath);
  }

  #bundleFileText(filepath: string): string | undefined {
    const loader = globalThis.__EGG_BUNDLE_FILE_LOADER__;
    if (!loader) return;
    return loader(this.#normalize(filepath));
  }

  #isManifestKnown(filepath: string): boolean {
    return this.#manifestEntryType(filepath) !== undefined;
  }

  #manifestEntryType(filepath: string): 'file' | 'directory' | undefined {
    const rel = this.#toRelative(filepath);
    if (rel === '' || this.#manifest.data.fileDiscovery[rel]) return 'directory';

    for (const [dir, files] of Object.entries(this.#manifest.data.fileDiscovery)) {
      if (files.includes(path.posix.relative(dir, rel))) return 'file';
    }

    for (const value of Object.values(this.#manifest.data.resolveCache)) {
      if (value && this.#normalize(value) === rel) return 'file';
    }
  }

  #syntheticStats(type: 'file' | 'directory'): Stats {
    return {
      isFile: () => type === 'file',
      isDirectory: () => type === 'directory',
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    } as Stats;
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
