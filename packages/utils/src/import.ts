import { debuglog } from 'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { ImportResolveError } from './error/index.js';

const debug = debuglog('@eggjs/utils/import');

export interface ImportResolveOptions {
  paths?: string[];
}

export interface ImportModuleOptions extends ImportResolveOptions {
  // only import export default object
  importDefaultOnly?: boolean;
}

export const isESM = typeof require === 'undefined';
const nodeMajorVersion = parseInt(process.versions.node.split('.', 1)[0], 10);
const supportImportMetaResolve = nodeMajorVersion >= 18;

let _customRequire: NodeRequire;
function getRequire() {
  if (!_customRequire) {
    if (typeof require !== 'undefined') {
      _customRequire = require;
    } else {
      _customRequire = createRequire(process.cwd());
    }
  }
  return _customRequire;
}

export function getExtensions() {
  return getRequire().extensions;
}

let _supportTypeScript: boolean | undefined;
export function isSupportTypeScript() {
  if (_supportTypeScript === undefined) {
    const extensions = getExtensions();
    // enable ts by process.env.EGG_TS_ENABLE or process.env.VITEST
    _supportTypeScript = extensions['.ts'] !== undefined || process.env.VITEST === 'true' || process.env.EGG_TS_ENABLE === 'true';
    debug('[isSupportTypeScript] %o, extensions: %j, process.env.VITEST: %j, process.env.EGG_TS_ENABLE: %j',
      _supportTypeScript, Object.keys(extensions), process.env.VITEST, process.env.EGG_TS_ENABLE);
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
  const defaultMainFile = isESM ? pkg.module ?? pkg.main : pkg.main;
  if (defaultMainFile) {
    const mainIndexFilePath = path.join(dirname, defaultMainFile);
    if (fs.existsSync(mainIndexFilePath)) {
      debug('[tryToResolveByDirnameFromPackage] %o, use pkg.main or pkg.module: %o, isESM: %s',
        mainIndexFilePath, defaultMainFile, isESM);
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
  return filepath.startsWith('./')
    || filepath.startsWith('../')
    || filepath.startsWith('.\\')
    || filepath.startsWith('..\\');
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
}

export function importResolve(filepath: string, options?: ImportResolveOptions) {
  // find *.json or CommonJS module by require.resolve
  // e.g.: importResolve('egg/package.json', { paths })
  const cwd = process.cwd();
  const paths = options?.paths ?? [ cwd ];

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
        debug('[importResolve:isRelativePath] %o => %o => %o',
          filepath, resolvedPath, moduleFilePath);
        return moduleFilePath;
      }
    }
  }

  // find from node_modules
  for (const p of paths) {
    let resolvedPath = path.join(p, 'node_modules', filepath);
    moduleFilePath = tryToResolveFromAbsoluteFile(resolvedPath);
    if (moduleFilePath) {
      debug('[importResolve:node_modules] %o => %o => %o',
        filepath, resolvedPath, moduleFilePath);
      return moduleFilePath;
    }

    // find from parent node_modules
    // non-scoped package, e.g: node_modules/egg
    let parentPath = path.dirname(p);
    if (path.basename(parentPath) === 'node_modules') {
      resolvedPath = path.join(parentPath, filepath);
      moduleFilePath = tryToResolveFromAbsoluteFile(resolvedPath);
      if (moduleFilePath) {
        debug('[importResolve:node_modules] %o => %o => %o',
          filepath, resolvedPath, moduleFilePath);
        return moduleFilePath;
      }
    }

    // scoped package, e.g: node_modules/@eggjs/tegg
    parentPath = path.dirname(parentPath);
    if (path.basename(parentPath) === 'node_modules') {
      resolvedPath = path.join(parentPath, filepath);
      moduleFilePath = tryToResolveFromAbsoluteFile(resolvedPath);
      if (moduleFilePath) {
        debug('[importResolve:node_modules] %o => %o => %o',
          filepath, resolvedPath, moduleFilePath);
        return moduleFilePath;
      }
    }
  }

  const extname = path.extname(filepath);
  if ((!isAbsolute && extname === '.json') || !isESM) {
    moduleFilePath = getRequire().resolve(filepath, {
      paths,
    });
  } else {
    if (supportImportMetaResolve) {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        moduleFilePath = import.meta.resolve(filepath);
      } catch (err) {
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
      moduleFilePath = getRequire().resolve(filepath);
    }
  }
  debug('[importResolve] %o, options: %o => %o, isESM: %s',
    filepath, options, moduleFilePath, isESM);
  return moduleFilePath;
}

export async function importModule(filepath: string, options?: ImportModuleOptions) {
  const moduleFilePath = importResolve(filepath, options);
  let obj: any;
  if (isESM) {
    // esm
    const fileUrl = pathToFileURL(moduleFilePath).toString();
    obj = await import(fileUrl);
    debug('[importModule] await import %o', fileUrl);
    // {
    //   default: { foo: 'bar', one: 1 },
    //   foo: 'bar',
    //   one: 1,
    //   [Symbol(Symbol.toStringTag)]: 'Module'
    // }
    if (obj?.default?.__esModule === true && 'default' in obj?.default) {
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
    debug('[importModule] return %o => keys: %j', filepath, obj ? Object.keys(obj) : obj);
  }
  return obj;
}
