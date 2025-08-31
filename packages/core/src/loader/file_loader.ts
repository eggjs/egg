import assert from 'node:assert';
import fs from 'node:fs';
import { debuglog } from 'node:util';
import path from 'node:path';

import globby from 'globby';
import {
  isClass,
  isGeneratorFunction,
  isAsyncFunction,
  isPrimitive,
} from 'is-type-of';
import { isSupportTypeScript } from '@eggjs/utils';

import utils, { type Fun } from '../utils/index.js';

const debug = debuglog('@eggjs/core/file_loader');

export const FULLPATH = Symbol('EGG_LOADER_ITEM_FULLPATH');
export const EXPORTS = Symbol('EGG_LOADER_ITEM_EXPORTS');

export enum CaseStyle {
  camel = 'camel',
  lower = 'lower',
  upper = 'upper',
}

export type CaseStyleFunction = (filepath: string) => string[];
export type FileLoaderInitializer = (
  exports: unknown,
  options: { path: string; pathName: string }
) => unknown;
export type FileLoaderFilter = (exports: unknown) => boolean;

export interface FileLoaderOptions {
  /** directories to be loaded */
  directory: string | string[];
  /** attach the target object from loaded files */

  target: Record<string, any>;
  /** match the files when load, support glob, default to all js files */
  match?: string | string[];
  /** ignore the files when load, support glob */
  ignore?: string | string[];
  /** custom file exports, receive two parameters, first is the inject object(if not js file, will be content buffer), second is an `options` object that contain `path` */
  initializer?: FileLoaderInitializer;
  /** determine whether invoke when exports is function */
  call?: boolean;
  /** determine whether override the property when get the same name */
  override?: boolean;
  /** an object that be the argument when invoke the function */

  inject?: Record<string, any>;
  /** a function that filter the exports which can be loaded */
  filter?: FileLoaderFilter;
  /** set property's case when converting a filepath to property list. */
  caseStyle?: CaseStyle | CaseStyleFunction;
  lowercaseFirst?: boolean;
}

export interface FileLoaderParseItem {
  fullpath: string;
  properties: string[];
  exports: object | Fun;
}

/**
 * Load files from directory to target object.
 * @since 1.0.0
 */
export class FileLoader {
  static get FULLPATH() {
    return FULLPATH;
  }

  static get EXPORTS() {
    return EXPORTS;
  }

  readonly options: FileLoaderOptions &
    Required<Pick<FileLoaderOptions, 'caseStyle'>>;

  /**
   * @class
   * @param {Object} options - options
   * @param {String|Array} options.directory - directories to be loaded
   * @param {Object} options.target - attach the target object from loaded files
   * @param {String} options.match - match the files when load, support glob, default to all js files
   * @param {String} options.ignore - ignore the files when load, support glob
   * @param {Function} options.initializer - custom file exports, receive two parameters, first is the inject object(if not js file, will be content buffer), second is an `options` object that contain `path`
   * @param {Boolean} options.call - determine whether invoke when exports is function
   * @param {Boolean} options.override - determine whether override the property when get the same name
   * @param {Object} options.inject - an object that be the argument when invoke the function
   * @param {Function} options.filter - a function that filter the exports which can be loaded
   * @param {String|Function} options.caseStyle - set property's case when converting a filepath to property list.
   */
  constructor(options: FileLoaderOptions) {
    assert(options.directory, 'options.directory is required');
    assert(options.target, 'options.target is required');
    this.options = {
      caseStyle: CaseStyle.camel,
      call: true,
      override: false,
      ...options,
    };

    // compatible old options _lowercaseFirst_
    if (this.options.lowercaseFirst === true) {
      utils.deprecated('lowercaseFirst is deprecated, use caseStyle instead');
      this.options.caseStyle = CaseStyle.lower;
    }
  }

  /**
   * attach items to target object. Mapping the directory to properties.
   * `app/controller/group/repository.js` => `target.group.repository`
   * @returns {Object} target
   * @since 1.0.0
   */
  async load(): Promise<object> {
    const items = await this.parse();
    const target = this.options.target;
    for (const item of items) {
      debug('loading item: %o', item);
      // item { properties: [ 'a', 'b', 'c'], exports }
      // => target.a.b.c = exports
      // oxlint-disable-next-line unicorn/no-array-reduce
      item.properties.reduce((target, property, index) => {
        let obj;
        const properties = item.properties.slice(0, index + 1).join('.');
        if (index === item.properties.length - 1) {
          if (property in target && !this.options.override) {
            throw new Error(
              `can't overwrite property '${properties}' from ${target[property][FULLPATH]} by ${item.fullpath}`
            );
          }
          obj = item.exports;
          if (obj && !isPrimitive(obj)) {
            Reflect.set(obj, FULLPATH, item.fullpath);
            Reflect.set(obj, EXPORTS, true);
          }
        } else {
          obj = target[property] || {};
        }
        target[property] = obj;
        debug('loaded item properties: %o => %o', properties, obj);
        return obj;
      }, target);
    }
    return target;
  }

  /**
   * Parse files from given directories, then return an items list, each item contains properties and exports.
   *
   * For example, parse `app/controller/group/repository.js`
   *
   * ```
   * module.exports = app => {
   *   return class RepositoryController extends app.Controller {};
   * }
   * ```
   *
   * It returns a item
   *
   * ```
   * {
   *   properties: [ 'group', 'repository' ],
   *   exports: app => { ... },
   * }
   * ```
   *
   * `Properties` is an array that contains the directory of a filepath.
   *
   * `Exports` depends on type, if exports is a function, it will be called. if initializer is specified, it will be called with exports for customizing.
   * @returns {Array} items
   * @since 1.0.0
   */
  protected async parse(): Promise<FileLoaderParseItem[]> {
    let files = this.options.match;
    if (files) {
      files = Array.isArray(files) ? files : [files];
    } else {
      files = isSupportTypeScript()
        ? ['**/*.(js|ts)', '!**/*.d.ts']
        : ['**/*.js'];
    }

    let ignore = this.options.ignore;
    if (ignore) {
      ignore = Array.isArray(ignore) ? ignore : [ignore];
      ignore = ignore.filter(f => !!f).map(f => '!' + f);
      files = files.concat(ignore);
    }

    let directories = this.options.directory;
    if (!Array.isArray(directories)) {
      directories = [directories];
    }

    const filter =
      typeof this.options.filter === 'function' ? this.options.filter : null;
    const items: FileLoaderParseItem[] = [];
    debug('[parse] parsing directories: %j', directories);
    for (const directory of directories) {
      const filepaths = globby.sync(files, { cwd: directory });
      debug(
        '[parse] globby files: %o, cwd: %o => %o',
        files,
        directory,
        filepaths
      );
      for (const filepath of filepaths) {
        const fullpath = path.join(directory, filepath);
        if (!fs.statSync(fullpath).isFile()) continue;
        if (filepath.endsWith('.js')) {
          const filepathTs = filepath.replace(/\.js$/, '.ts');
          if (filepaths.includes(filepathTs)) {
            debug('[parse] ignore %s, because %s exists', fullpath, filepathTs);
            continue;
          }
        }
        // get properties
        // app/service/foo/bar.js => [ 'foo', 'bar' ]
        const properties = getProperties(filepath, this.options.caseStyle);
        // app/service/foo/bar.js => service.foo.bar
        const pathName =
          directory.split(/[/\\]/).slice(-1) + '.' + properties.join('.');
        // get exports from the file
        const exports = await getExports(fullpath, this.options, pathName);

        // ignore exports when it's null or false returned by filter function
        if (
          exports === null ||
          exports === undefined ||
          (filter && filter(exports) === false)
        ) {
          continue;
        }

        // set properties of class
        if (isClass(exports)) {
          exports.prototype.pathName = pathName;
          exports.prototype.fullPath = fullpath;
        }

        items.push({ fullpath, properties, exports });
        debug(
          '[parse] parse %s, properties %j, exports %o',
          fullpath,
          properties,
          exports
        );
      }
    }

    return items;
  }
}

// convert file path to an array of properties
// a/b/c.js => ['a', 'b', 'c']
function getProperties(
  filepath: string,
  caseStyle: CaseStyle | CaseStyleFunction
) {
  // if caseStyle is function, return the result of function
  if (typeof caseStyle === 'function') {
    const result = caseStyle(filepath);
    assert(
      Array.isArray(result),
      `caseStyle expect an array, but got ${JSON.stringify(result)}`
    );
    return result;
  }
  // use default camelize
  return defaultCamelize(filepath, caseStyle);
}

// Get exports from filepath
// If exports is null/undefined, it will be ignored
async function getExports(
  fullpath: string,
  options: FileLoaderOptions,
  pathName: string
) {
  let exports = await utils.loadFile(fullpath);
  // process exports as you like
  if (options.initializer) {
    exports = options.initializer(exports, { path: fullpath, pathName });
    debug('[getExports] after initializer => %o', exports);
  }

  if (isGeneratorFunction(exports)) {
    throw new TypeError(
      `Support for generators was removed, fullpath: ${fullpath}`
    );
  }

  // return exports when it's a class or async function
  //
  // module.exports = class Service {};
  // or
  // module.exports = async function() {}
  if (isClass(exports) || isAsyncFunction(exports)) {
    return exports;
  }

  // return exports after call when it's a function
  //
  // module.exports = function(app) {
  //   return {};
  // }
  if (options.call && typeof exports === 'function') {
    exports = exports(options.inject);
    if (exports !== null && exports !== undefined) {
      return exports;
    }
  }

  // return exports what is
  return exports;
}

function defaultCamelize(filepath: string, caseStyle: CaseStyle) {
  const properties = filepath.slice(0, filepath.lastIndexOf('.')).split('/');
  return properties.map(property => {
    if (!/^[a-z][a-z0-9_-]*$/i.test(property)) {
      throw new Error(`${property} is not match 'a-z0-9_-' in ${filepath}`);
    }

    // use default camelize, will capitalize the first letter
    // foo_bar.js > FooBar
    // fooBar.js  > FooBar
    // FooBar.js  > FooBar
    // FooBar.js  > FooBar
    // FooBar.js  > fooBar (if lowercaseFirst is true)
    property = property.replaceAll(/[_-][a-z]/gi, s =>
      s.slice(1).toUpperCase()
    );
    let first = property[0];
    if (caseStyle === CaseStyle.lower) {
      first = first.toLowerCase();
    } else if (caseStyle === CaseStyle.upper) {
      first = first.toUpperCase();
    }
    return first + property.slice(1);
  });
}
