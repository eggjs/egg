import { debuglog } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { stat } from 'node:fs/promises';
import BuiltinModule from 'node:module';

import { importResolve, importModule } from '@eggjs/utils';

const debug = debuglog('@eggjs/core/utils');

export type Fun = (...args: unknown[]) => unknown;

// Guard against poorly mocked module constructors.
const Module =
  typeof module !== 'undefined' && module.constructor.length > 1
    ? module.constructor
    : /* istanbul ignore next */
      BuiltinModule;

const extensions = (Module as any)._extensions;
const extensionNames = Object.keys(extensions).concat(['.cjs', '.mjs']);
debug('Module extensions: %j', extensionNames);

function getCalleeFromStack(withLine?: boolean, stackIndex?: number) {
  stackIndex = stackIndex === undefined ? 2 : stackIndex;
  const limit = Error.stackTraceLimit;
  const prep = Error.prepareStackTrace;

  Error.prepareStackTrace = prepareObjectStackTrace;
  Error.stackTraceLimit = 5;

  // capture the stack

  const obj: any = {};
  Error.captureStackTrace(obj);
  let callSite = obj.stack[stackIndex];
  let fileName = '';
  if (callSite) {
    // egg-mock will create a proxy
    // https://github.com/eggjs/egg-mock/blob/master/lib/app.js#L174
    fileName = callSite.getFileName();
    /* istanbul ignore if */
    if (fileName && fileName.endsWith('egg-mock/lib/app.js')) {
      // TODO: add test
      callSite = obj.stack[stackIndex + 1];
      fileName = callSite.getFileName();
    }
  }

  Error.prepareStackTrace = prep;
  Error.stackTraceLimit = limit;

  if (!callSite || !fileName) return '<anonymous>';
  if (!withLine) return fileName;
  return `${fileName}:${callSite.getLineNumber()}:${callSite.getColumnNumber()}`;
}

export default {
  deprecated(message: string) {
    if (debug.enabled) {
      console.trace('[@eggjs/core/deprecated] %s', message);
    } else {
      console.log('[@eggjs/core/deprecated] %s', message);
      console.log(
        '[@eggjs/core/deprecated] set NODE_DEBUG=@eggjs/core/utils can show call stack'
      );
    }
  },

  extensions,
  extensionNames,

  async existsPath(filepath: string) {
    try {
      await stat(filepath);
      return true;
    } catch {
      return false;
    }
  },

  async loadFile(filepath: string) {
    try {
      // if not js module, just return content buffer
      const extname = path.extname(filepath);
      if (extname && !extensionNames.includes(extname) && extname !== '.ts') {
        return fs.readFileSync(filepath);
      }
      const obj = await importModule(filepath, { importDefaultOnly: true });
      return obj;
    } catch (e) {
      if (!(e instanceof Error)) {
        // ts error: test/fixtures/apps/app-ts/app/extend/context.ts(5,17): error TS2339: Property 'url' does not exist on type 'Context'
        console.trace(e);
        throw e;
      }
      const err = new Error(
        `[@eggjs/core] load file: ${filepath}, error: ${e.message}`
      );
      err.cause = e;
      debug('[loadFile] handle %s error: %s', filepath, e);
      throw err;
    }
  },

  resolvePath(filepath: string, options?: { paths?: string[] }) {
    return importResolve(filepath, options);
  },

  methods: ['head', 'options', 'get', 'put', 'patch', 'post', 'delete'],

  async callFn(fn: Fun, args?: unknown[], ctx?: unknown) {
    args = args || [];
    if (typeof fn !== 'function') return;
    return ctx ? fn.call(ctx, ...args) : fn(...args);
  },

  getCalleeFromStack,

  getResolvedFilename(filepath: string, baseDir: string) {
    const reg = /[/\\]/g;
    return filepath.replace(baseDir + path.sep, '').replace(reg, '/');
  },
};

/**
 * Capture call site stack from v8.
 * https://github.com/v8/v8/wiki/Stack-Trace-API
 */
function prepareObjectStackTrace(_obj: unknown, stack: unknown) {
  return stack;
}
