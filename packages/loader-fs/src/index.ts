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

// Detect vitest's "environment was torn down" error, raised when a dynamic
// import() resolves after the test environment that issued it has already been
// torn down. It is reported by name (`EnvironmentTeardownError`) and/or message,
// possibly nested behind a `cause`, so walk a short cause chain.
//
// Gated on `process.env.VITEST` so this is unmistakably a test-runner-only
// accommodation: the condition only exists inside the vitest runner during
// teardown and never in production, so outside vitest we never swallow.
function isEnvironmentTeardownError(e: unknown): boolean {
  if (!process.env.VITEST) return false;
  let cur = e as { name?: unknown; message?: unknown; cause?: unknown } | undefined | null;
  for (let depth = 0; cur && depth < 5; depth++) {
    if (cur.name === 'EnvironmentTeardownError') return true;
    if (typeof cur.message === 'string' && cur.message.includes('after the environment was torn down')) {
      return true;
    }
    cur = cur.cause as typeof cur;
  }
  return false;
}

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
      if (extname === '.json') {
        return JSON.parse(await fs.promises.readFile(filepath, 'utf8'));
      }
      if (extname && !extensionNames.includes(extname) && extname !== '.ts') {
        return fs.readFileSync(filepath);
      }
      return await importModule(filepath, { importDefaultOnly: true });
    } catch (e) {
      // `isEnvironmentTeardownError` is gated on `process.env.VITEST`, so this
      // swallow only ever applies inside the vitest runner and can never alter
      // production loader behavior.
      if (isEnvironmentTeardownError(e)) {
        // A dynamic import() that loses the race with a vitest test-environment
        // teardown throws EnvironmentTeardownError ("Cannot load X ... after the
        // environment was torn down"). This happens only inside the vitest runner
        // as a test ends — never in production — and the load result is unusable
        // anyway. Returning a benign empty value (instead of throwing) keeps the
        // stray load from surfacing as an unhandled rejection that, under vitest
        // `isolate: false`, gets blamed on whatever unrelated test file is running
        // when the import settles. Loaders already treat an empty module as "no
        // exports", so this is a safe no-op.
        debug('[loadFile] ignore environment-teardown race for %s', filepath);
        return undefined;
      }
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

export { ManifestLoaderFS, type LoaderFSManifest, type LoaderFSManifestData } from './manifest_loader_fs.ts';
