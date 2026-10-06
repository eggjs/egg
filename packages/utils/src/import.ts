import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { debuglog } from 'node:util';

import type { BundleModuleLoader } from '@eggjs/typings';
import type {} from '@eggjs/typings/global';

import { ImportResolveError } from './error/index.ts';

const debug = debuglog('egg/utils/import');

type NativeDynamicImport = (specifier: string) => Promise<any>;

let nativeDynamicImport: NativeDynamicImport | undefined;

/* v8 ignore next -- covered by the spawned Node fixture; Vitest cannot instrument this opaque import. */
function getNativeDynamicImport(): NativeDynamicImport {
  if (!nativeDynamicImport) {
    // Keep the fallback dynamic import opaque to bundlers. Turbopack rewrites
    // dynamic import expressions with non-static specifiers, which breaks the
    // bundled runtime when the bundle map intentionally falls through to Node.
    try {
      // oxlint-disable-next-line typescript-eslint/no-implied-eval
      nativeDynamicImport = new Function('specifier', 'return import(specifier);') as NativeDynamicImport;
    } catch (err) {
      const error = new Error(
        'Native dynamic import fallback for bundled module loader misses requires code generation from strings.',
      );
      (error as Error & { cause?: unknown }).cause = err;
      throw error;
    }
  }
  return nativeDynamicImport;
}

export interface ImportResolveOptions {
  paths?: string[];
}

export interface ImportModuleOptions extends ImportResolveOptions {
  // only import export default object
  importDefaultOnly?: boolean;
}

// detect is esm or cjs
export let isESM = true;
try {
  // Accessing import.meta will throw an error in CJS
  if (typeof import.meta !== 'undefined') {
    isESM = true;
  }
} catch {
  // If import.meta is not available, it's likely CJS
  isESM = false;
}
// Remember the auto-detected module format. `setSnapshotModuleLoader` flips
// `isESM` to false while a snapshot loader is active; clearing the loader must
// restore this value so consumers running later in the same realm are not left
// stuck in CJS mode. This matters under vitest `isolate: false`, where module
// state persists across test files.
const detectedIsESM = isESM;
const nodeMajorVersion = parseInt(process.versions.node.split('.', 1)[0], 10);
// Feature-detect instead of gating on the Node version: when the code is shipped
// inside a bundle (e.g. @utoo/pack rewrites `import.meta` to a runtime shim that
// lacks `.resolve`), `import.meta.resolve` is not a function even on Node >= 18, so
// calling it throws. Detecting the actual capability lets us fall back to
// `require.resolve` in the bundled CommonJS runtime.
const supportImportMetaResolve =
  nodeMajorVersion >= 18 &&
  typeof import.meta !== 'undefined' &&
  typeof (import.meta as { resolve?: unknown }).resolve === 'function';

let _customRequire: NodeRequire;
export function getRequire(): NodeRequire {
  if (!_customRequire) {
    // In V8 snapshot builder context, the built-in `require` is a restricted
    // `requireForUserSnapshot` that lacks `.extensions` and `.resolve` for
    // user-land modules. Prefer `createRequire` when `require.extensions` is
    // missing, so that file resolution (isSupportTypeScript, etc.) works.
    if (typeof require !== 'undefined' && require.extensions) {
      _customRequire = require;
    } else {
      _customRequire = createRequire(process.cwd());
    }
  }
  return _customRequire;
}

export function getExtensions(): NodeJS.RequireExtensions {
  return getRequire().extensions;
}

let _supportTypeScript: boolean | undefined;
export function isSupportTypeScript(): boolean {
  // disable ts by process.env.EGG_TS_ENABLE = 'false', @eggjs/scripts start will use it to disable ts
  if (process.env.EGG_TS_ENABLE === 'false') {
    return false;
  }

  if (_supportTypeScript === undefined) {
    const extensions = getExtensions();
    // enable ts by process.env.EGG_TS_ENABLE or process.env.VITEST
    _supportTypeScript =
      extensions['.ts'] !== undefined ||
      process.env.VITEST === 'true' ||
      process.env.EGG_TS_ENABLE === 'true' ||
      // Node.js doesn't support enum by default
      nodeMajorVersion >= 22;
    debug(
      '[isSupportTypeScript] %o, extensions: %j, process.env.VITEST: %j, process.env.EGG_TS_ENABLE: %j, node version: %s',
      _supportTypeScript,
      Object.keys(extensions),
      process.env.VITEST,
      process.env.EGG_TS_ENABLE,
      process.versions.node,
    );
  }
  return _supportTypeScript;
}

function tryToResolveFromFile(filepath: string): string | undefined {
  // "type": "module", try index.mjs then index.js
  const type = isESM ? 'module' : 'commonjs';
  let mainIndexFile = '';
  if (type === 'module') {
    mainIndexFile = filepath + '.mjs';
    if (fs.existsSync(mainIndexFile)) {
      debug('[tryToResolveFromFile] %o, use index.mjs, type: %o', mainIndexFile, type);
      return mainIndexFile;
    }
    mainIndexFile = filepath + '.js';
    if (fs.existsSync(mainIndexFile)) {
      debug('[tryToResolveFromFile] %o, use index.js, type: %o', mainIndexFile, type);
      return mainIndexFile;
    }
  } else {
    // "type": "commonjs", try index.js then index.cjs
    mainIndexFile = filepath + '.cjs';
    if (fs.existsSync(mainIndexFile)) {
      debug('[tryToResolveFromFile] %o, use index.cjs, type: %o', mainIndexFile, type);
      return mainIndexFile;
    }
    mainIndexFile = filepath + '.js';
    if (fs.existsSync(mainIndexFile)) {
      debug('[tryToResolveFromFile] %o, use index.js, type: %o', mainIndexFile, type);
      return mainIndexFile;
    }
  }

  if (!isSupportTypeScript()) {
    return;
  }

  // for the module under development
  mainIndexFile = filepath + '.ts';
  if (fs.existsSync(mainIndexFile)) {
    debug('[tryToResolveFromFile] %o, use index.ts, type: %o', mainIndexFile, type);
    return mainIndexFile;
  }
}

function tryToResolveByDirnameFromPackage(dirname: string, pkg: any): string | undefined {
  // try to read pkg.main or pkg.module first
  // "main": "./dist/commonjs/index.js",
  // "module": "./dist/esm/index.js"
  const defaultMainFile = isESM ? (pkg.module ?? pkg.main) : pkg.main;
  if (defaultMainFile) {
    const mainIndexFilePath = path.join(dirname, defaultMainFile);
    if (fs.existsSync(mainIndexFilePath)) {
      debug(
        '[tryToResolveByDirnameFromPackage] %o, use pkg.main or pkg.module: %o, isESM: %s',
        mainIndexFilePath,
        defaultMainFile,
        isESM,
      );
      return mainIndexFilePath;
    }
  }
  // detect from exports
  if (pkg.exports?.['.']) {
    const pkgType: string = pkg.type ?? 'commonjs';
    const defaultExport = pkg.exports['.'] as
      | string
      | {
          import?:
            | string
            | {
                default?: string;
              };
          require?:
            | string
            | {
                default?: string;
              };
        };
    let mainIndexFilePath = '';
    if (typeof defaultExport === 'string') {
      mainIndexFilePath = path.join(dirname, defaultExport);
    } else {
      // "type": "module",
      if (pkgType === 'module') {
        if (typeof defaultExport.import === 'string') {
          mainIndexFilePath = path.join(dirname, defaultExport.import);
        } else if (typeof defaultExport.import?.default === 'string') {
          mainIndexFilePath = path.join(dirname, defaultExport.import.default);
        }
      } else {
        // "type": "commonjs",
        if (typeof defaultExport.require === 'string') {
          mainIndexFilePath = path.join(dirname, defaultExport.require);
        } else if (typeof defaultExport.require?.default === 'string') {
          mainIndexFilePath = path.join(dirname, defaultExport.require.default);
        }
      }
    }
    if (mainIndexFilePath && fs.existsSync(mainIndexFilePath)) {
      debug(
        '[tryToResolveByDirnameFromPackage] %o, use pkg.exports[.]: %o, pkg.type: %o',
        mainIndexFilePath,
        defaultExport,
        pkgType,
      );
      return mainIndexFilePath;
    }
  }

  // "type": "module", try index.mjs then index.js
  const type = pkg?.type ?? (isESM ? 'module' : 'commonjs');
  if (type === 'module') {
    const mainIndexFilePath = path.join(dirname, 'index.mjs');
    if (fs.existsSync(mainIndexFilePath)) {
      debug('[tryToResolveByDirnameFromPackage] %o, use index.mjs, pkg.type: %o', mainIndexFilePath, type);
      return mainIndexFilePath;
    }
    const mainIndexMjsFilePath = path.join(dirname, 'index.js');
    if (fs.existsSync(mainIndexMjsFilePath)) {
      debug('[tryToResolveByDirnameFromPackage] %o, use index.js, pkg.type: %o', mainIndexMjsFilePath, type);
      return mainIndexMjsFilePath;
    }
  } else {
    // "type": "commonjs", try index.cjs then index.js
    const mainIndexFilePath = path.join(dirname, 'index.cjs');
    if (fs.existsSync(mainIndexFilePath)) {
      debug('[tryToResolveByDirnameFromPackage] %o, use index.cjs, pkg.type: %o', mainIndexFilePath, type);
      return mainIndexFilePath;
    }
    const mainIndexCjsFilePath = path.join(dirname, 'index.js');
    if (fs.existsSync(mainIndexCjsFilePath)) {
      debug('[tryToResolveByDirnameFromPackage] %o, use index.js, pkg.type: %o', mainIndexCjsFilePath, type);
      return mainIndexCjsFilePath;
    }
  }

  if (!isSupportTypeScript()) {
    return;
  }

  // for the module under development
  // "tshy": {
  //   "exports": {
  //     "./package.json": "./package.json",
  //     ".": "./src/index.ts"
  //   }
  // }
  const mainIndexFile = pkg.tshy?.exports?.['.'] ?? 'index.ts';
  const mainIndexFilePath = path.join(dirname, mainIndexFile);
  if (fs.existsSync(mainIndexFilePath)) {
    return mainIndexFilePath;
  }
}

function tryToResolveByDirname(dirname: string): string | undefined {
  let pkg: any = {};
  const pkgFile = path.join(dirname, 'package.json');
  if (fs.existsSync(pkgFile)) {
    pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
  }
  return tryToResolveByDirnameFromPackage(dirname, pkg);
}

function isRelativePath(filepath: string): boolean {
  return (
    filepath.startsWith('./') || filepath.startsWith('../') || filepath.startsWith('.\\') || filepath.startsWith('..\\')
  );
}

function tryToResolveFromAbsoluteFile(filepath: string): string | undefined {
  let moduleFilePath: string | undefined;
  const stat = fs.statSync(filepath, { throwIfNoEntry: false });
  // try to resolve from directory
  if (stat?.isDirectory()) {
    moduleFilePath = tryToResolveByDirname(filepath);
    if (moduleFilePath) {
      return moduleFilePath;
    }
  } else if (stat?.isFile()) {
    return filepath;
  }
  // try to resolve from file
  moduleFilePath = tryToResolveFromFile(filepath);
  if (moduleFilePath) {
    return moduleFilePath;
  }

  // try to resolve from parent directory and read package.json#exports
  // e.g: /path/to/mock/app => /path/to/mock/src/app.ts
  // {
  //   "exports": {
  //     "./app": "./src/app.ts"
  //   }
  // }
  const parentDir = path.dirname(filepath);
  const basename = path.basename(filepath);
  const pkgFile = path.join(parentDir, 'package.json');
  if (fs.existsSync(pkgFile)) {
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
    const key = `./${basename}`;
    if (pkg.exports?.[key]) {
      return path.join(parentDir, pkg.exports[key]);
    }
  }
}

export function importResolve(filepath: string, options?: ImportResolveOptions): string {
  // find *.json or CommonJS module by require.resolve
  // e.g.: importResolve('egg/package.json', { paths })
  const paths = options?.paths ?? [process.cwd()];
  debug('[importResolve] filepath: %o, options: %j, paths: %j', filepath, options, paths);

  let moduleFilePath: string | undefined;
  const isAbsolute = path.isAbsolute(filepath);
  if (isAbsolute) {
    moduleFilePath = tryToResolveFromAbsoluteFile(filepath);
    if (moduleFilePath) {
      debug('[importResolve:isAbsolute] %o => %o', filepath, moduleFilePath);
      return moduleFilePath;
    }
  } else if (isRelativePath(filepath)) {
    for (const p of paths) {
      const resolvedPath = path.resolve(p, filepath);
      moduleFilePath = tryToResolveFromAbsoluteFile(resolvedPath);
      if (moduleFilePath) {
        debug('[importResolve:isRelativePath] %o => %o => %o', filepath, resolvedPath, moduleFilePath);
        return moduleFilePath;
      }
    }
  }

  // find from node_modules
  for (const p of paths) {
    let resolvedPath = path.join(p, 'node_modules', filepath);
    moduleFilePath = tryToResolveFromAbsoluteFile(resolvedPath);
    if (moduleFilePath) {
      debug('[importResolve:node_modules] %o => %o => %o', filepath, resolvedPath, moduleFilePath);
      return moduleFilePath;
    }

    // find from parent node_modules
    // non-scoped package, e.g: node_modules/egg
    let parentPath = path.dirname(p);
    if (path.basename(parentPath) === 'node_modules') {
      resolvedPath = path.join(parentPath, filepath);
      moduleFilePath = tryToResolveFromAbsoluteFile(resolvedPath);
      if (moduleFilePath) {
        debug('[importResolve:node_modules] %o => %o => %o', filepath, resolvedPath, moduleFilePath);
        return moduleFilePath;
      }
    }

    // scoped package, e.g: node_modules/@eggjs/tegg
    parentPath = path.dirname(parentPath);
    if (path.basename(parentPath) === 'node_modules') {
      resolvedPath = path.join(parentPath, filepath);
      moduleFilePath = tryToResolveFromAbsoluteFile(resolvedPath);
      if (moduleFilePath) {
        debug('[importResolve:node_modules] %o => %o => %o', filepath, resolvedPath, moduleFilePath);
        return moduleFilePath;
      }
    }
  }

  // In bundle mode a module's source may not exist on disk (it is inlined into the
  // bundle). After on-disk resolution has failed, if the registered bundle module
  // loader recognizes the path, treat it as already resolved and return it as the
  // canonical key, mirroring importModule. This must run before import.meta.resolve
  // (which is unavailable in the bundled runtime).
  const bundleModuleLoader = globalThis.__EGG_BUNDLE_MODULE_LOADER__;
  if (bundleModuleLoader && bundleModuleLoader(normalizeBundleModulePath(filepath)) !== undefined) {
    debug('[importResolve:bundle] %o => %o', filepath, filepath);
    return filepath;
  }

  const extname = path.extname(filepath);
  if ((!isAbsolute && extname === '.json') || !isESM) {
    moduleFilePath = getRequire().resolve(filepath, {
      paths,
    });
  } else {
    if (supportImportMetaResolve) {
      try {
        moduleFilePath = import.meta.resolve(filepath);
      } catch (err) {
        debug('[importResolve:error] import.meta.resolve %o => %o, options: %o', filepath, err, options);
        throw new ImportResolveError(filepath, paths, err as Error);
      }
      if (moduleFilePath.startsWith('file://')) {
        // resolve will return file:// URL on Linux and MacOS expect on Windows
        moduleFilePath = fileURLToPath(moduleFilePath);
      }
      debug('[importResolve] import.meta.resolve %o => %o', filepath, moduleFilePath);
      const stat = fs.statSync(moduleFilePath, { throwIfNoEntry: false });
      if (!stat?.isFile()) {
        throw new TypeError(`Cannot find module ${filepath}, because ${moduleFilePath} does not exists`);
      }
    } else {
      // Fallback when `import.meta.resolve` is unavailable (e.g. inside a bundle).
      // Forward `paths` so package resolution still honours the caller's lookup
      // dirs (the app baseDir / framework dirs), matching the on-disk attempts above.
      moduleFilePath = getRequire().resolve(filepath, paths ? { paths } : undefined);
    }
  }
  debug('[importResolve:success] %o, options: %o => %o, isESM: %s', filepath, options, moduleFilePath, isESM);
  return moduleFilePath;
}

/**
 * Module loader function type for V8 snapshot support.
 * Called with the resolved absolute file path, returns the module exports.
 */
export type SnapshotModuleLoader = (resolvedPath: string) => any;

let _snapshotModuleLoader: SnapshotModuleLoader | undefined;

/**
 * Register a snapshot module loader that intercepts `importModule()` calls.
 *
 * When set, `importModule()` delegates to this loader instead of calling
 * `import()` or `require()`. This is used by the V8 snapshot entry generator
 * to provide pre-bundled modules — the bundler generates a static module map
 * from the egg manifest and registers it via this API.
 *
 * Also sets `isESM = false` because the snapshot bundle is CJS and
 * esbuild's `import.meta` polyfill causes incorrect ESM detection.
 *
 * Pass `undefined` to clear the loader and restore the auto-detected `isESM`
 * value. Always clear it once snapshot mode is no longer needed (e.g. in test
 * teardown) so the module-level state does not leak into other files when
 * vitest runs with `isolate: false`.
 */
export function setSnapshotModuleLoader(loader: SnapshotModuleLoader | undefined): void {
  _snapshotModuleLoader = loader;
  isESM = loader ? false : detectedIsESM;
}

export type { BundleModuleLoader } from '@eggjs/typings';

function normalizeBundleModulePath(filepath: string): string {
  return filepath.split(path.win32.sep).join(path.posix.sep);
}

/**
 * Register a bundle module loader. Uses globalThis so that bundled and
 * external copies of @eggjs/utils share the same loader.
 *
 * The loader receives a POSIX-normalized filepath or virtual specifier before
 * normal resolution runs. Return `undefined` to fall through to the default
 * import path. Non-undefined hits use the same default unwrapping semantics as
 * normal imports, including `importDefaultOnly` and double-default `__esModule`
 * compatibility.
 */
export function setBundleModuleLoader(loader: BundleModuleLoader | undefined): void {
  globalThis.__EGG_BUNDLE_MODULE_LOADER__ = loader;
}

// Shared promises for ESM imports that are currently in flight, keyed by file URL.
// See the usage site in `importModule` for why this is needed.
const _inflightImports = new Map<string, Promise<any>>();

export async function importModule(filepath: string, options?: ImportModuleOptions): Promise<any> {
  const _bundleModuleLoader = globalThis.__EGG_BUNDLE_MODULE_LOADER__;
  if (_bundleModuleLoader) {
    const hit = _bundleModuleLoader(normalizeBundleModulePath(filepath));
    if (hit !== undefined) {
      let obj = hit as any;
      if (obj?.default?.__esModule === true && 'default' in obj.default) obj = obj.default;
      if (options?.importDefaultOnly && obj && typeof obj === 'object' && 'default' in obj) obj = obj.default;
      return obj;
    }
  }

  const moduleFilePath = importResolve(filepath, options);

  if (_snapshotModuleLoader) {
    let obj = _snapshotModuleLoader(moduleFilePath);
    if (obj && typeof obj === 'object' && obj.default?.__esModule === true && obj.default && 'default' in obj.default) {
      obj = obj.default;
    }
    if (options?.importDefaultOnly) {
      if (obj && typeof obj === 'object' && 'default' in obj) {
        obj = obj.default;
      }
    }
    return obj;
  }

  // Async module importer override (e.g. a Vitest runner that loads the module
  // through its own module graph). Same `ModuleImporter` global the tegg loader
  // uses, so app/boot files and tegg modules resolve via one realm under test.
  const _moduleImporter = globalThis.__EGG_MODULE_IMPORTER__;
  if (_moduleImporter) {
    let obj = (await _moduleImporter(moduleFilePath)) as any;
    if (obj && typeof obj === 'object' && obj.default?.__esModule === true && obj.default && 'default' in obj.default) {
      obj = obj.default;
    }
    if (options?.importDefaultOnly && obj && typeof obj === 'object' && 'default' in obj) {
      obj = obj.default;
    }
    return obj;
  }

  let obj: any;
  if (isESM) {
    // esm
    const fileUrl = pathToFileURL(moduleFilePath).toString();
    debug('[importModule:start] await import fileUrl: %s, isESM: %s', fileUrl, isESM);
    /* v8 ignore if -- covered by the spawned Node fixture; Vitest cannot instrument this opaque import. */
    if (_bundleModuleLoader) {
      obj = await getNativeDynamicImport()(fileUrl);
    } else {
      // Dedupe concurrent in-flight imports of the same URL. The runtime TS
      // transpile loaders (tsx, @oxc-node/core) recompile a module on every
      // `import()` (tsx appends a cache-busting query), so when several apps boot
      // concurrently in one process (e.g. tegg multi-app isolation) two loaders can
      // trigger two simultaneous compiles of the SAME module and one may observe a
      // partially-initialized namespace (an `undefined` default export) — surfacing
      // downstream as `Cannot convert undefined or null to object` in `loadExtend`
      // or a plugin that lost its `path`. Sharing a single `import()` per URL
      // serializes those concurrent first-loads.
      let pending = _inflightImports.get(fileUrl);
      if (pending === undefined) {
        pending = import(fileUrl);
        _inflightImports.set(fileUrl, pending);
        const clearInflight = () => {
          if (_inflightImports.get(fileUrl) === pending) {
            _inflightImports.delete(fileUrl);
          }
        };
        // `then(clear, clear)` (not `finally`) so a failed import settles the
        // cleanup chain without leaving an unhandled rejection — the awaiting
        // caller below still observes and propagates the original error.
        pending.then(clearInflight, clearInflight);
      }
      obj = await pending;
    }
    debug('[importModule:success] await import %o', fileUrl);
    // {
    //   default: { foo: 'bar', one: 1 },
    //   foo: 'bar',
    //   one: 1,
    //   [Symbol(Symbol.toStringTag)]: 'Module'
    // }
    if (obj?.default?.__esModule === true && obj.default && 'default' in obj.default) {
      // 兼容 cjs 模拟 esm 的导出格式
      // {
      //   __esModule: true,
      //   default: {
      //     __esModule: true,
      //     default: {
      //       fn: [Function: fn] { [length]: 0, [name]: 'fn' },
      //       foo: 'bar',
      //       one: 1
      //     }
      //   },
      //   [Symbol(Symbol.toStringTag)]: 'Module'
      // }
      // 兼容 ts module
      // {
      //   default: {
      //     [__esModule]: true,
      //     default: <ref *1> [Function: default_1] {
      //       [length]: 0,
      //       [name]: 'default_1',
      //       [prototype]: { [constructor]: [Circular *1] }
      //     }
      //   },
      //   [Symbol(Symbol.toStringTag)]: 'Module'
      // }
      obj = obj.default;
    }
    if (options?.importDefaultOnly) {
      if ('default' in obj) {
        obj = obj.default;
      }
    }
  } else {
    // commonjs
    obj = require(moduleFilePath);
    debug('[importModule] require %o', moduleFilePath);
    if (obj?.__esModule === true && 'default' in obj) {
      // 兼容 cjs 模拟 esm 的导出格式
      // {
      //   __esModule: true,
      //   default: { fn: [Function: fn], foo: 'bar', one: 1 }
      // }
      obj = obj.default;
    }
  }
  if (debug.enabled) {
    debug('[importModule] return %o => keys: %j, typeof obj: %s', filepath, obj ? Object.keys(obj) : obj, typeof obj);
  }
  return obj;
}
