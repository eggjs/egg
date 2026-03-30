import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

import { build } from 'esbuild';

const HTTP_STUB = `
let _real;
function getReal() {
  if (!_real) {
    console.trace('[HTTP-DEFER] Loading real node:http');
    _real = require('node:http');
  }
  return _real;
}
const METHODS = ['ACL','BIND','CHECKOUT','CONNECT','COPY','DELETE','GET','HEAD','LINK','LOCK','M-SEARCH','MERGE','MKACTIVITY','MKCALENDAR','MKCOL','MOVE','NOTIFY','OPTIONS','PATCH','POST','PRI','PROPFIND','PROPPATCH','PURGE','PUT','QUERY','REBIND','REPORT','SEARCH','SOURCE','SUBSCRIBE','TRACE','UNBIND','UNLINK','UNLOCK','UNSUBSCRIBE'];
const STATUS_CODES = {100:'Continue',101:'Switching Protocols',200:'OK',201:'Created',202:'Accepted',204:'No Content',206:'Partial Content',301:'Moved Permanently',302:'Found',303:'See Other',304:'Not Modified',307:'Temporary Redirect',308:'Permanent Redirect',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',405:'Method Not Allowed',408:'Request Timeout',409:'Conflict',410:'Gone',413:'Payload Too Large',414:'URI Too Long',415:'Unsupported Media Type',416:'Range Not Satisfiable',422:'Unprocessable Entity',429:'Too Many Requests',500:'Internal Server Error',501:'Not Implemented',502:'Bad Gateway',503:'Service Unavailable',504:'Gateway Timeout'};
const STATIC = { METHODS, STATUS_CODES };
module.exports = new Proxy({}, {
  get(_, prop) {
    if (prop === '__esModule') return false;
    if (prop === 'default') return module.exports;
    if (prop in STATIC) return STATIC[prop];
    return getReal()[prop];
  },
  set(_, prop, value) { getReal()[prop] = value; return true; },
  has(_, prop) { if (prop in STATIC) return true; if (!_real) return false; return prop in _real; },
  ownKeys() { if (!_real) return Object.keys(STATIC); return Reflect.ownKeys(_real); },
  getOwnPropertyDescriptor(_, prop) {
    if (prop in STATIC) return { value: STATIC[prop], writable: true, enumerable: true, configurable: true };
    if (!_real) return undefined;
    return Object.getOwnPropertyDescriptor(_real, prop);
  },
});
`;

function httpDeferPlugin() {
  return {
    name: 'http-defer',
    setup(build) {
      build.onResolve({ filter: /^(node:)?http$/ }, (args) => {
        if (args.path !== 'http' && args.path !== 'node:http') return null;
        if (args.namespace === 'http-defer') return { path: 'node:http', external: true };
        return { path: 'node:http', namespace: 'http-defer' };
      });
      build.onLoad({ filter: /.*/, namespace: 'http-defer' }, () => ({
        contents: HTTP_STUB,
        loader: 'js',
      }));
    },
  };
}

function http2DeferPlugin() {
  return {
    name: 'http2-defer',
    setup(build) {
      build.onResolve({ filter: /^(node:)?http2$/ }, (args) => {
        if (args.path !== 'http2' && args.path !== 'node:http2') return null;
        if (args.namespace === 'http2-defer') return { path: 'node:http2', external: true };
        return { path: 'node:http2', namespace: 'http2-defer' };
      });
      build.onLoad({ filter: /.*/, namespace: 'http2-defer' }, () => ({
        contents: `
let _real;
function getReal() {
  if (!_real) _real = require('node:http2');
  return _real;
}
module.exports = new Proxy({}, {
  get(_, prop) {
    if (prop === '__esModule') return false;
    if (prop === 'default') return module.exports;
    return getReal()[prop];
  },
  set(_, prop, value) { getReal()[prop] = value; return true; },
  has(_, prop) { if (!_real) return false; return prop in _real; },
  ownKeys() { if (!_real) return []; return Reflect.ownKeys(_real); },
  getOwnPropertyDescriptor(_, prop) {
    if (!_real) return undefined;
    return Object.getOwnPropertyDescriptor(_real, prop);
  },
});
`,
        loader: 'js',
      }));
    },
  };
}

function urllibStubPlugin() {
  return {
    name: 'urllib-stub',
    setup(build) {
      build.onResolve({ filter: /^urllib$/ }, () => ({ path: 'urllib', namespace: 'urllib-stub' }));
      build.onLoad({ filter: /.*/, namespace: 'urllib-stub' }, () => ({
        contents: `
          class HttpClient { constructor(o) { this.options = o || {}; } async request() { throw new Error('stub'); } }
          module.exports = { HttpClient };
          module.exports.default = { HttpClient };
        `,
        loader: 'js',
      }));
    },
  };
}

function fileUrlResolverPlugin() {
  return {
    name: 'file-url-resolver',
    setup(build) {
      build.onResolve({ filter: /^file:\/\// }, (args) => ({
        path: fileURLToPath(args.path),
      }));
    },
  };
}

function optionalDepsStubPlugin() {
  // Optional dependencies that may not be installed. Stub them so esbuild
  // can bundle the code that references them, and the snapshot builder's
  // requireForUserSnapshot doesn't crash.
  const stubs = new Set([
    'pg',
    'pg-types',
    'sql.js',
    'sqlite3',
    'better-sqlite3',
    'mysql',
    'mysql2',
    'oracledb',
    'tedious',
  ]);
  return {
    name: 'optional-deps-stub',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (stubs.has(args.path)) {
          return { path: args.path, namespace: 'optional-stub' };
        }
        return null;
      });
      build.onLoad({ filter: /.*/, namespace: 'optional-stub' }, (args) => ({
        contents: `module.exports = new Proxy({}, { get(_, prop) { if (prop === '__esModule') return false; throw new Error('Optional dependency "${args.path}" is not available during snapshot build'); } });`,
        loader: 'js',
      }));
    },
  };
}

function importMetaPolyfillPlugin() {
  return {
    name: 'import-meta-polyfill',
    setup(build) {
      build.onLoad({ filter: /\.(ts|js|mjs|cjs)$/ }, async (args) => {
        const contents = await fs.promises.readFile(args.path, 'utf8');
        if (!contents.includes('import.meta.')) return null;
        const dirname = path.dirname(args.path);
        const url = pathToFileURL(args.path).href;
        const modified = contents
          .replace(/\bimport\.meta\.dirname\b/g, JSON.stringify(dirname))
          .replace(/\bimport\.meta\.url\b/g, JSON.stringify(url))
          .replace(/\bimport\.meta\.filename\b/g, JSON.stringify(args.path));
        if (modified === contents) return null;
        const ext = path.extname(args.path);
        const loader = ext === '.ts' ? 'ts' : 'js';
        return { contents: modified, loader };
      });
    },
  };
}

const entryPath = 'dist/snapshot-entry.mjs';
const bundlePath = 'dist/snapshot-bundle.cjs';

await build({
  entryPoints: [entryPath],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node22',
  outfile: bundlePath,
  tsconfigRaw: JSON.stringify({
    compilerOptions: { experimentalDecorators: true, emitDecoratorMetadata: true },
  }),
  external: ['fsevents', 'cpu-features'],
  logLevel: 'warning',
  banner: {
    js: [
      'globalThis.__EGG_SNAPSHOT_CJS_BUNDLE__ = true;',
      // Delete the Web API lazy getters first to prevent triggering Node.js
      // built-in undici initialization (which uses WebAssembly, unavailable
      // during --build-snapshot). Then install lightweight stubs so that
      // packages like @hono/node-server can read them at module init time.
      'delete globalThis.Request; delete globalThis.Response; delete globalThis.Headers; delete globalThis.fetch;',
      'globalThis.Request = class Request { constructor(u,o){this.url=u;this.method=(o&&o.method)||"GET";this.headers=new Map();} };',
      'globalThis.Response = class Response { constructor(b,o){this.body=b;this.status=(o&&o.status)||200;this.headers=new Map();} };',
      'globalThis.Headers = class Headers extends Map {};',
    ].join('\n'),
  },
  plugins: [
    httpDeferPlugin(),
    http2DeferPlugin(),
    urllibStubPlugin(),
    optionalDepsStubPlugin(),
    fileUrlResolverPlugin(),
    importMetaPolyfillPlugin(),
  ],
});
console.log('Bundle rebuilt:', bundlePath);
