import fs, { type Stats } from 'node:fs';

import globby from 'globby';
import { readJSON } from 'utility';

import utils from '../utils/index.ts';

export interface LoaderFSGlobOptions {
  cwd?: string;
  [key: string]: unknown;
}

export interface LoaderFS {
  exists(filepath: string): boolean;
  stat(filepath: string): Stats;
  realpath(filepath: string): string;
  readJSON<T = unknown>(filepath: string): Promise<T>;
  glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[];
  loadFile(filepath: string): Promise<any>;
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

  async readJSON<T = unknown>(filepath: string): Promise<T> {
    return readJSON(filepath) as Promise<T>;
  }

  glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
    return globby.sync(patterns, options as any) as unknown as string[];
  }

  async loadFile(filepath: string): Promise<any> {
    return utils.loadFile(filepath);
  }
}
