import fs, { type Stats } from 'node:fs';
import BuiltinModule from 'node:module';
import path from 'node:path';
import { debuglog } from 'node:util';

import { importModule } from '@eggjs/utils';
import globby from 'globby';
import { readJSONSync } from 'utility';

const debug = debuglog('egg/loader-fs');

export type LoaderFSGlobOptions = globby.GlobbyOptions;

export interface LoaderFS {
  exists(filepath: string): boolean;
  stat(filepath: string): Stats;
  realpath(filepath: string): string;
  readJSON<T = unknown>(filepath: string): T;
  glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[];
  loadFile(filepath: string): Promise<unknown>;
}

interface ModuleConstructorWithExtensions {
  _extensions: Record<string, unknown>;
}

const ModuleConstructor =
  typeof module !== 'undefined' && module.constructor.length > 1
    ? (module.constructor as unknown as ModuleConstructorWithExtensions)
    : (BuiltinModule as unknown as ModuleConstructorWithExtensions);
const extensionNames = Object.keys(ModuleConstructor._extensions).concat(['.cjs', '.mjs']);

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

  readJSON<T = unknown>(filepath: string): T {
    return readJSONSync(filepath) as T;
  }

  glob(patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
    return globby.sync(patterns, options);
  }

  async loadFile(filepath: string): Promise<unknown> {
    debug('[loadFile:start] filepath: %s', filepath);
    try {
      const extname = path.extname(filepath);
      if (extname && !extensionNames.includes(extname) && extname !== '.ts') {
        return fs.readFileSync(filepath);
      }
      return await importModule(filepath, { importDefaultOnly: true });
    } catch (e) {
      if (!(e instanceof Error)) {
        console.trace(e);
        throw e;
      }
      const err = new Error(`[egg/core] load file: ${filepath}, error: ${e.message}`);
      err.cause = e;
      debug('[loadFile] handle %s error: %s', filepath, e);
      throw err;
    }
  }
}
