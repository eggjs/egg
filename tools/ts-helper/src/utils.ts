import fs from 'node:fs';
import glob from 'globby';
import path from 'node:path';
import ts from 'typescript';
import yn from 'yn';
import { execFileSync, execFile, ExecFileOptions } from 'node:child_process';
import JSON5 from 'json5';
import { eggInfoPath, tmpDir } from './config.js';

export const JS_CONFIG = {
  include: [ '**/*' ],
};

export const TS_CONFIG: Partial<TsConfigJson> = {
  compilerOptions: {
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.CommonJS,
    strict: true,
    noImplicitAny: false,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    allowSyntheticDefaultImports: true,
    allowJs: false,
    pretty: true,
    lib: [ 'es6' ],
    noEmitOnError: false,
    noUnusedLocals: true,
    noUnusedParameters: true,
    allowUnreachableCode: false,
    allowUnusedLabels: false,
    strictPropertyInitialization: false,
    noFallthroughCasesInSwitch: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    inlineSourceMap: true,
  },
};

export interface TsConfigJson {
  extends: string;
  compilerOptions: ts.CompilerOptions;
}

export interface GetEggInfoOpt {
  cwd: string;
  cacheIndex?: string;
  customLoader?: any;
  async?: boolean;
  env?: PlainObject<string>;
  callback?: (result: EggInfoResult) => any;
}

export interface EggPluginInfo {
  from: string;
  enable: boolean;
  package?: string;
  path: string;
  etsConfig?: PlainObject;
}

export interface EggInfoResult {
  eggPaths?: string[];
  plugins?: PlainObject<EggPluginInfo>;
  config?: PlainObject;
  timing?: number;
}

const cacheEggInfo = {};
export function getEggInfo<T extends 'async' | 'sync' = 'sync'>(option: GetEggInfoOpt): T extends 'async' ? Promise<EggInfoResult> : EggInfoResult {
  const { cacheIndex, cwd, customLoader } = option;
  const cacheKey = cacheIndex ? `${cacheIndex}${cwd}` : undefined;
  const caches = cacheKey ? (cacheEggInfo[cacheKey] = cacheEggInfo[cacheKey] || {}) : undefined;
  const end = (json: EggInfoResult) => {
    if (caches) {
      caches.eggInfo = json;
      caches.cacheTime = Date.now();
    }

    if (option.callback) {
      return option.callback(json);
    }

    return json;
  };

  // check cache
  if (caches) {
    if (caches.cacheTime && (Date.now() - caches.cacheTime) < 1000) {
      return end(caches.eggInfo);
    } else if (caches.runningPromise) {
      return caches.runningPromise;
    }
  }

  // get egg info from customLoader
  if (customLoader) {
    return end({
      config: customLoader.config,
      plugins: customLoader.plugins,
      eggPaths: customLoader.eggPaths,
    });
  }

  // prepare options
  const cmd = 'node';
  const args = [ path.resolve(__dirname, './scripts/eggInfo') ];
  const opt: ExecFileOptions = {
    cwd,
    env: {
      ...process.env,
      TS_NODE_TYPE_CHECK: 'false',
      TS_NODE_TRANSPILE_ONLY: 'true',
      TS_NODE_FILES: 'false',
      EGG_TYPESCRIPT: 'true',
      CACHE_REQUIRE_PATHS_FILE: path.resolve(tmpDir, './requirePaths.json'),
      ...option.env,
    },
  };

  if (option.async) {
    // cache promise
    caches.runningPromise = new Promise((resolve, reject) => {
      execFile(cmd, args, opt, err => {
        caches.runningPromise = null;
        if (err) reject(err);
        resolve(end(parseJson(fs.readFileSync(eggInfoPath, 'utf-8'))));
      });
    });

    return caches.runningPromise;
  }

  try {
    execFileSync(cmd, args, opt);
    return end(parseJson(fs.readFileSync(eggInfoPath, 'utf-8')));
  } catch {
    return end({});
  }
}

// convert string to same type with default value
export function convertString<T>(val: string | undefined, defaultVal: T): T {
  if (val === undefined) return defaultVal;
  switch (typeof defaultVal) {
    case 'boolean':
      return yn(val, { default: defaultVal }) as any;
    case 'number':
      const num = +val;
      return (isNaN(num) ? defaultVal : num) as any;
    case 'string':
      return val as any;
    default:
      return defaultVal;
  }
}

export function isIdentifierName(s: string) {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(s);
}

// load ts/js files
export function loadFiles(cwd: string, pattern?: string | string[]) {
  pattern = pattern || '**/*.(js|ts)';
  pattern = Array.isArray(pattern) ? pattern : [ pattern ];
  const fileList = glob.sync(pattern.concat([ '!**/*.d.ts' ]), { cwd });
  return fileList.filter(f => {
    // filter same name js/ts
    return !(
      f.endsWith('.js') &&
      fileList.includes(f.substring(0, f.length - 2) + 'ts')
    );
  });
}

// write jsconfig.json to cwd
export function writeJsConfig(cwd: string) {
  const jsconfigUrl = path.resolve(cwd, './jsconfig.json');
  if (!fs.existsSync(jsconfigUrl)) {
    fs.writeFileSync(jsconfigUrl, JSON.stringify(JS_CONFIG, null, 2));
    return jsconfigUrl;
  }
}

// write tsconfig.json to cwd
export function writeTsConfig(cwd: string) {
  const tsconfigUrl = path.resolve(cwd, './tsconfig.json');
  if (!fs.existsSync(tsconfigUrl)) {
    fs.writeFileSync(tsconfigUrl, JSON.stringify(TS_CONFIG, null, 2));
    return tsconfigUrl;
  }
}

export function checkMaybeIsTsProj(cwd: string, pkgInfo?: any) {
  pkgInfo = pkgInfo || getPkgInfo(cwd);
  return (pkgInfo.egg && pkgInfo.egg.typescript) ||
    fs.existsSync(path.resolve(cwd, './tsconfig.json')) ||
    fs.existsSync(path.resolve(cwd, './config/config.default.ts')) ||
    fs.existsSync(path.resolve(cwd, './config/config.ts'));
}

export function checkMaybeIsJsProj(cwd: string, pkgInfo?: any) {
  pkgInfo = pkgInfo || getPkgInfo(cwd);
  const isJs = !checkMaybeIsTsProj(cwd, pkgInfo) &&
    (
      fs.existsSync(path.resolve(cwd, './config/config.default.js')) ||
      fs.existsSync(path.resolve(cwd, './jsconfig.json'))
    );

  return isJs;
}

// load modules to object
export function loadModules<T = any>(cwd: string, loadDefault?: boolean, preHandle?: (...args) => any) {
  const modules: { [key: string]: T } = {};
  preHandle = preHandle || (fn => fn);
  fs
    .readdirSync(cwd)
    .filter(f => f.endsWith('.js'))
    .forEach(f => {
      const name = f.substring(0, f.lastIndexOf('.'));
      const obj = require(path.resolve(cwd, name));
      if (loadDefault && obj.default) {
        modules[name] = preHandle!(obj.default);
      } else {
        modules[name] = preHandle!(obj);
      }
    });
  return modules;
}

// convert string to function
export function strToFn(fn) {
  if (typeof fn === 'string') {
    return (...args: any[]) => fn.replace(/{{\s*(\d+)\s*}}/g, (_, index) => args[index]);
  }
  return fn;

}

// pick fields from object
export function pickFields<T extends string = string>(obj: PlainObject, fields: T[]) {
  const newObj: PlainObject = {};
  fields.forEach(f => (newObj[f] = obj[f]));
  return newObj;
}

// log
export function log(msg: string, prefix = true) {
  console.info(`${prefix ? '[egg-ts-helper] ' : ''}${msg}`);
}

// get import context
export function getImportStr(
  from: string,
  to: string,
  moduleName?: string,
  importStar?: boolean,
) {
  const extname = path.extname(to);
  const toPathWithoutExt = to.substring(0, to.length - extname.length);
  const importPath = path.relative(from, toPathWithoutExt).replace(/\/|\\/g, '/');
  const isTS = extname === '.ts' || fs.existsSync(`${toPathWithoutExt}.d.ts`);
  const importStartStr = isTS && importStar ? '* as ' : '';
  const fromStr = isTS ? `from '${importPath}.js'` : `= require('${importPath}')`;
  return `import ${importStartStr}${moduleName} ${fromStr};`;
}

// write file, using fs.writeFileSync to block io that d.ts can create before egg app started.
export function writeFileSync(fileUrl, content) {
  fs.mkdirSync(path.dirname(fileUrl), { recursive: true });
  fs.writeFileSync(fileUrl, content);
}

// clean same name js/ts
export function cleanJs(cwd: string) {
  const fileList: string[] = [];
  glob
    .sync([ '**/*.ts', '**/*.tsx', '!**/*.d.ts', '!**/node_modules', '!**/.sff' ], { cwd })
    .forEach(f => {
      const jf = removeSameNameJs(path.resolve(cwd, f));
      if (jf) fileList.push(path.relative(cwd, jf));
    });

  if (fileList.length) {
    console.info('[egg-ts-helper] These file was deleted because the same name ts file was exist!\n');
    console.info('  ' + fileList.join('\n  ') + '\n');
  }
}

// get moduleName by file path
export function getModuleObjByPath(f: string) {
  const props = f.substring(0, f.lastIndexOf('.')).split('/');

  // composing moduleName
  const moduleName = props.map(prop => camelProp(prop, 'upper')).join('');

  return {
    props,
    moduleName,
  };
}

// format path sep to /
export function formatPath(str: string) {
  return str.replace(/\/|\\/g, '/');
}

export function toArray(pattern?: string | string[]) {
  return pattern ? (Array.isArray(pattern) ? pattern : [ pattern ]) : [];
}

// remove same name js
export function removeSameNameJs(f: string) {
  if (!f.match(/\.tsx?$/) || f.endsWith('.d.ts')) {
    return;
  }

  const jf = f.replace(/tsx?$/, 'js');
  if (fs.existsSync(jf)) {
    fs.unlinkSync(jf);
    return jf;
  }
}

// resolve module
export function resolveModule(url) {
  try {
    return require.resolve(url);
  } catch {
    return undefined;
  }
}

// check whether module is exist
export function moduleExist(mod: string, cwd?: string) {
  const nodeModulePath = path.resolve(cwd || process.cwd(), 'node_modules', mod);
  return fs.existsSync(nodeModulePath) || resolveModule(mod);
}

// require modules
export function requireFile(url) {
  url = url && resolveModule(url);
  if (!url) {
    return undefined;
  }

  let exp = require(url);
  if (exp.__esModule && 'default' in exp) {
    exp = exp.default;
  }

  return exp;
}

// extend
export function extend<T = any>(obj, ...args: Array<Partial<T>>): T {
  args.forEach(source => {
    let descriptor,
      prop;
    if (source) {
      for (prop in source) {
        descriptor = Object.getOwnPropertyDescriptor(source, prop);
        Object.defineProperty(obj, prop, descriptor);
      }
    }
  });

  return obj;
}

// parse json
export function parseJson(jsonStr: string) {
  if (jsonStr) {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return {};
    }
  } else {
    return {};
  }
}

// load package.json
export function getPkgInfo(cwd: string) {
  return readJson(path.resolve(cwd, 'package.json'));
}

// read json file
export function readJson(jsonUrl: string) {
  if (!fs.existsSync(jsonUrl)) return {};
  return parseJson(fs.readFileSync(jsonUrl, 'utf-8'));
}

export function readJson5(jsonUrl: string) {
  if (!fs.existsSync(jsonUrl)) return {};
  return JSON5.parse(fs.readFileSync(jsonUrl, 'utf-8'));
}

// format property
export function formatProp(prop: string) {
  return prop.replace(/[._-][a-z]/gi, s => s.substring(1).toUpperCase());
}

// like egg-core/file-loader
export function camelProp(
  property: string,
  caseStyle: string | ((...args: any[]) => string),
): string {
  if (typeof caseStyle === 'function') {
    return caseStyle(property);
  }

  // camel transfer
  property = formatProp(property);
  let first = property[ 0 ];
  // istanbul ignore next
  switch (caseStyle) {
    case 'lower':
      first = first.toLowerCase();
      break;
    case 'upper':
      first = first.toUpperCase();
      break;
    case 'camel':
      break;
    default:
      break;
  }

  return first + property.substring(1);
}

// load tsconfig.json
export function loadTsConfig(tsconfigPath: string): ts.CompilerOptions {
  tsconfigPath = path.extname(tsconfigPath) === '.json' ? tsconfigPath : `${tsconfigPath}.json`;
  const tsConfig = readJson5(tsconfigPath) as TsConfigJson;
  if (tsConfig.extends) {
    const extendPattern = tsConfig.extends;
    const tsconfigDirName = path.dirname(tsconfigPath);
    const maybeRealExtendPath: string[] = [
      path.resolve(tsconfigDirName, extendPattern),
      path.resolve(tsconfigDirName, `${extendPattern}.json`),
    ];
    const isExtendFromNodeModules = !extendPattern.startsWith('.') && !extendPattern.startsWith('/');
    if (isExtendFromNodeModules) {
      const DEFAULT_TS_CONFIG_FILE_NAME = 'tsconfig.json';
      const extendTsConfigPath = !path.extname(extendPattern) ? DEFAULT_TS_CONFIG_FILE_NAME : '';
      maybeRealExtendPath.push(
        path.resolve(tsconfigDirName, 'node_modules', extendPattern, extendTsConfigPath),
        path.resolve(process.cwd(), 'node_modules', extendPattern, extendTsConfigPath),
      );
    }

    const extendRealPath = maybeRealExtendPath.find(f => fs.existsSync(f));
    if (extendRealPath) {
      const extendTsConfig = loadTsConfig(extendRealPath);
      return {
        ...tsConfig.compilerOptions,
        ...extendTsConfig,
      };
    }
  }
  return tsConfig.compilerOptions || {};
}

/**
 * ts ast utils
 */

// find export node from sourcefile.
export function findExportNode(code: string) {
  const sourceFile = ts.createSourceFile('file.ts', code, ts.ScriptTarget.ES2017, true);
  const cache: Map<ts.__String, ts.Node> = new Map();
  const exportNodeList: ts.Node[] = [];
  let exportDefaultNode: ts.Node | undefined;

  sourceFile.statements.forEach(node => {
    // each node in root scope
    if (modifierHas(node, ts.SyntaxKind.ExportKeyword)) {
      if (modifierHas(node, ts.SyntaxKind.DefaultKeyword)) {
        // export default
        exportDefaultNode = node;
      } else {
        // export variable
        if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach(declare =>
            exportNodeList.push(declare),
          );
        } else {
          exportNodeList.push(node);
        }
      }
    } else if (ts.isVariableStatement(node)) {
      // cache variable statement
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          cache.set(declaration.name.escapedText, declaration.initializer);
        }
      }
    } else if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
      // cache function declaration and class declaration
      cache.set(node.name.escapedText, node);
    } else if (ts.isExportAssignment(node)) {
      // export default {}
      exportDefaultNode = node.expression;
    } else if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression)) {
      if (ts.isPropertyAccessExpression(node.expression.left)) {
        const obj = node.expression.left.expression;
        const prop = node.expression.left.name;
        if (ts.isIdentifier(obj)) {
          if (obj.escapedText === 'exports') {
            // exports.xxx = {}
            exportNodeList.push(node.expression);
          } else if (
            obj.escapedText === 'module' &&
            ts.isIdentifier(prop) &&
            prop.escapedText === 'exports'
          ) {
            // module.exports = {}
            exportDefaultNode = node.expression.right;
          }
        }
      } else if (ts.isIdentifier(node.expression.left)) {
        // let exportData;
        // exportData = {};
        // export exportData
        cache.set(node.expression.left.escapedText, node.expression.right);
      }
    }
  });

  while (exportDefaultNode && ts.isIdentifier(exportDefaultNode) && cache.size) {
    const mid = cache.get(exportDefaultNode.escapedText);
    cache.delete(exportDefaultNode.escapedText);
    exportDefaultNode = mid;
  }

  return {
    exportDefaultNode,
    exportNodeList,
  };
}

export function isClass(v): v is { new (...args: any[]): any } {
  return typeof v === 'function' && /^\s*class\s+/.test(v.toString());
}

// check kind in node.modifiers.
export function modifierHas(node, kind) {
  return node.modifiers && node.modifiers.find(mod => kind === mod.kind);
}

export function cleanEmpty(data) {
  const clearData = {};
  Object.keys(data).forEach(k => {
    const dataValue = data[k];
    if (dataValue !== undefined && dataValue !== null) {
      clearData[k] = data[k];
    }
  });
  return clearData;
}
