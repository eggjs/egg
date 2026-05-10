import fs, { type Stats } from 'node:fs';
import BuiltinModule from 'node:module';
import path from 'node:path';
import { debuglog } from 'node:util';

import { importModule } from '@eggjs/utils';
import globby from 'globby';
import { readJSONSync } from 'utility';

const debug = debuglog('egg/loader-fs');

type CommonJSModuleConstructor = {
  _extensions?: Record<string, unknown>;
};

// Guard against poorly mocked module constructors.
const Module = typeof module !== 'undefined' && module.constructor.length > 1 ? module.constructor : BuiltinModule;

const extensions = (Module as unknown as CommonJSModuleConstructor)._extensions ?? {};
const extensionNames = Object.keys(extensions).concat(['.js', '.cjs', '.mjs']);

export type LoaderFSGlobOptions = globby.GlobbyOptions;

export interface LoaderFS {
  exists(filepath: string): boolean;
  stat(filepath: string): Stats;
  realpath(filepath: string): string;
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
      }
      const message = e instanceof Error ? e.message : String(e);
      const err = new Error(`[@eggjs/loader-fs] load file: ${filepath}, error: ${message}`);
      err.cause = e;
      debug('[loadFile] handle %s error: %s', filepath, e);
      throw err;
    }
  }
}
