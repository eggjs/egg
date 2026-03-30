import { spawn, type SpawnOptions } from 'node:child_process';
import fs from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { debuglog } from 'node:util';

import { getFrameworkPath } from '@eggjs/utils';
import { Args, Flags } from '@oclif/core';
import { build as esbuildBundle, type Plugin as EsbuildPlugin } from 'esbuild';
import { readJSON } from 'utility';

import { BaseCommand } from '../baseCommand.ts';

const debug = debuglog('egg/scripts/commands/snapshot-build');

/**
 * esbuild plugin: resolve file:// URL imports to file paths.
 * The generated snapshot entry uses file:// URLs for absolute imports.
 */
function fileUrlResolverPlugin(): EsbuildPlugin {
  return {
    name: 'file-url-resolver',
    setup(build) {
      build.onResolve({ filter: /^file:\/\// }, (args) => ({
        path: fileURLToPath(args.path),
      }));
    },
  };
}

/**
 * esbuild plugin: replace `urllib` with a lightweight stub.
 *
 * urllib (via undici) compiles a WASM llhttp parser at module-evaluation
 * time. WebAssembly is not available inside `node --build-snapshot`, so
 * we replace urllib with a minimal stub that exports a no-op HttpClient
 * base class. The egg HttpClient getter is lazy and never constructs an
 * instance during snapshot build, so the stub is never exercised.
 *
 * At snapshot restore time, `registerSnapshotCallbacks()` in egg.ts
 * patches the prototype chain with the real urllib.HttpClient loaded via
 * `createRequire`, so HTTP requests work normally after restore.
 */
function urllibStubPlugin(): EsbuildPlugin {
  return {
    name: 'urllib-stub',
    setup(build) {
      build.onResolve({ filter: /^urllib$/ }, () => ({
        path: 'urllib',
        namespace: 'urllib-stub',
      }));
      build.onLoad({ filter: /.*/, namespace: 'urllib-stub' }, () => ({
        contents: `
          // Stub for urllib — avoids WebAssembly dependency during snapshot build.
          // The real urllib is loaded at restore time via createRequire().
          class HttpClient {
            constructor(options) { this.options = options || {}; }
            async request() { throw new Error('urllib stub: not available during snapshot build'); }
          }
          module.exports = { HttpClient };
          module.exports.default = { HttpClient };
        `,
        loader: 'js',
      }));
    },
  };
}

/**
 * esbuild plugin: defer `node:http` loading via a lazy Proxy.
 *
 * `require('node:http')` at module evaluation time registers global
 * native handles (HTTPParser, ConnectionsList) that V8 cannot serialize
 * into a startup snapshot. This plugin replaces `node:http` (and `http`)
 * with a lazy Proxy that defers `require('node:http')` until the first
 * property access at restore time.
 *
 * During snapshot build, the egg framework only uses `http` for type
 * annotations and event listener registration (no property access), so
 * the proxy is never triggered. At restore time, the first access to
 * e.g. `http.createServer` loads the real module transparently.
 */
function httpDeferPlugin(): EsbuildPlugin {
  return {
    name: 'http-defer',
    setup(build) {
      // Match both 'http' and 'node:http', but not from within the proxy itself
      build.onResolve({ filter: /^(node:)?http$/ }, (args) => {
        // Only intercept bare 'http' / 'node:http', not 'node:http2' etc.
        if (args.path !== 'http' && args.path !== 'node:http') return null;
        // Don't intercept the require inside our own proxy module
        if (args.namespace === 'http-defer') return { path: 'node:http', external: true };
        return {
          path: 'node:http',
          namespace: 'http-defer',
        };
      });
      build.onLoad({ filter: /.*/, namespace: 'http-defer' }, () => ({
        contents: `
          // Lazy proxy for node:http — defers require() until first property access.
          // This avoids registering HTTPParser/ConnectionsList global handles during
          // V8 snapshot build (which would cause CheckGlobalAndEternalHandles failure).
          //
          // Static data is provided for METHODS and STATUS_CODES so that packages
          // like 'methods' (used by koa-router) which read http.METHODS at module
          // evaluation time don't trigger loading the real module.
          //
          // IMPORTANT: ownKeys/getOwnPropertyDescriptor must NOT trigger loading the
          // real module, because esbuild's __toESM() helper enumerates exports via
          // Object.getOwnPropertyNames() at bundle evaluation time.
          let _real;
          function getReal() {
            if (!_real) _real = require('node:http');
            return _real;
          }

          // Static copies of http.METHODS and http.STATUS_CODES.
          // These are stable across Node.js versions and safe to inline.
          const METHODS = [
            'ACL','BIND','CHECKOUT','CONNECT','COPY','DELETE','GET','HEAD',
            'LINK','LOCK','M-SEARCH','MERGE','MKACTIVITY','MKCALENDAR',
            'MKCOL','MOVE','NOTIFY','OPTIONS','PATCH','POST','PRI',
            'PROPFIND','PROPPATCH','PURGE','PUT','QUERY','REBIND','REPORT',
            'SEARCH','SOURCE','SUBSCRIBE','TRACE','UNBIND','UNLINK',
            'UNLOCK','UNSUBSCRIBE',
          ];
          const STATUS_CODES = {
            100:'Continue',101:'Switching Protocols',102:'Processing',
            103:'Early Hints',200:'OK',201:'Created',202:'Accepted',
            203:'Non-Authoritative Information',204:'No Content',
            205:'Reset Content',206:'Partial Content',207:'Multi-Status',
            208:'Already Reported',226:'IM Used',300:'Multiple Choices',
            301:'Moved Permanently',302:'Found',303:'See Other',
            304:'Not Modified',305:'Use Proxy',307:'Temporary Redirect',
            308:'Permanent Redirect',400:'Bad Request',401:'Unauthorized',
            402:'Payment Required',403:'Forbidden',404:'Not Found',
            405:'Method Not Allowed',406:'Not Acceptable',
            407:'Proxy Authentication Required',408:'Request Timeout',
            409:'Conflict',410:'Gone',411:'Length Required',
            412:'Precondition Failed',413:'Payload Too Large',
            414:'URI Too Long',415:'Unsupported Media Type',
            416:'Range Not Satisfiable',417:'Expectation Failed',
            418:"I'm a Teapot",421:'Misdirected Request',
            422:'Unprocessable Entity',423:'Locked',424:'Failed Dependency',
            425:'Too Early',426:'Upgrade Required',
            428:'Precondition Required',429:'Too Many Requests',
            431:'Request Header Fields Too Large',
            451:'Unavailable For Legal Reasons',
            500:'Internal Server Error',501:'Not Implemented',
            502:'Bad Gateway',503:'Service Unavailable',
            504:'Gateway Timeout',505:'HTTP Version Not Supported',
            506:'Variant Also Negotiates',507:'Insufficient Storage',
            508:'Loop Detected',510:'Not Extended',
            511:'Network Authentication Required',
          };

          // Properties that can be served without loading the real module.
          const STATIC = { METHODS, STATUS_CODES };

          module.exports = new Proxy({}, {
            get(_, prop) {
              if (prop === '__esModule') return false;
              if (prop === 'default') return module.exports;
              if (prop in STATIC) return STATIC[prop];
              return getReal()[prop];
            },
            set(_, prop, value) {
              getReal()[prop] = value;
              return true;
            },
            has(_, prop) {
              if (prop in STATIC) return true;
              if (!_real) return false;
              return prop in _real;
            },
            ownKeys() {
              if (!_real) return Object.keys(STATIC);
              return Reflect.ownKeys(_real);
            },
            getOwnPropertyDescriptor(_, prop) {
              if (prop in STATIC) {
                return { value: STATIC[prop], writable: true, enumerable: true, configurable: true };
              }
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

/**
 * esbuild plugin: defer `node:http2` loading via a lazy Proxy.
 *
 * `require('node:http2')` internally triggers `undici` initialization which
 * compiles WebAssembly (llhttp parser). WebAssembly is not available during
 * `node --build-snapshot`, so we defer http2 loading until first property
 * access at restore time.
 */
function http2DeferPlugin(): EsbuildPlugin {
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

/**
 * esbuild plugin: stub optional dependencies that may not be installed.
 *
 * Database drivers (mysql2, pg, etc.) are often transitive dependencies of
 * ORM packages but are only needed at runtime when actually connecting to
 * a database. In the snapshot builder, `requireForUserSnapshot` cannot load
 * npm packages, so these must be stubbed.
 */
function optionalDepsStubPlugin(): EsbuildPlugin {
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

/**
 * esbuild plugin: polyfill import.meta.dirname/url/filename for CJS output.
 *
 * When bundling ESM to CJS, import.meta is empty. This plugin replaces
 * import.meta references with literal values computed from each source
 * file's real path at bundle time.
 */
function importMetaPolyfillPlugin(): EsbuildPlugin {
  return {
    name: 'import-meta-polyfill',
    setup(build) {
      build.onLoad({ filter: /\.(ts|js|mjs|cjs)$/ }, async (args) => {
        const contents = await fs.readFile(args.path, 'utf8');
        if (!contents.includes('import.meta.')) return null;

        const dirname = path.dirname(args.path);
        const url = pathToFileURL(args.path).href;

        const modified = contents
          .replace(/\bimport\.meta\.dirname\b/g, JSON.stringify(dirname))
          .replace(/\bimport\.meta\.url\b/g, JSON.stringify(url))
          .replace(/\bimport\.meta\.filename\b/g, JSON.stringify(args.path));

        if (modified === contents) return null;

        const ext = path.extname(args.path);
        const loader = ext === '.ts' ? ('ts' as const) : ('js' as const);
        return { contents: modified, loader };
      });
    },
  };
}

export default class SnapshotBuild<T extends typeof SnapshotBuild> extends BaseCommand<T> {
  static override description = 'Build a V8 startup snapshot for faster application startup';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --output ./snapshot.blob',
    '<%= config.bin %> <%= command.id %> --env prod --port 3000',
  ];

  static override args = {
    baseDir: Args.string({
      description: 'directory of application',
      required: false,
    }),
  };

  static override flags = {
    framework: Flags.string({
      description: 'specify framework that can be absolute path or npm package',
    }),
    env: Flags.string({
      description: 'server env for the snapshot',
      default: 'prod',
    }),
    port: Flags.integer({
      description: 'default port baked into snapshot (overridable at start time via PORT env)',
      char: 'p',
      default: 7001,
    }),
    output: Flags.string({
      description: 'output path for the snapshot blob file',
      char: 'o',
      default: 'snapshot.blob',
    }),
    node: Flags.string({
      description: 'custom node command path',
      default: 'node',
    }),
    title: Flags.string({
      description: 'default process title baked into snapshot',
    }),
    sourcemap: Flags.boolean({
      summary: 'whether enable sourcemap support',
      aliases: ['ts', 'typescript'],
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = this;

    const cwd = process.cwd();
    let baseDir = args.baseDir || cwd;
    if (!path.isAbsolute(baseDir)) {
      baseDir = path.join(cwd, baseDir);
    }
    await this.initBaseInfo(baseDir);

    const frameworkPath = await getFrameworkPath({
      framework: flags.framework,
      baseDir,
    });

    let frameworkName = 'egg';
    try {
      const frameworkPkg = await readJSON(path.join(frameworkPath, 'package.json'));
      if (frameworkPkg.name) {
        frameworkName = frameworkPkg.name;
      }
    } catch {
      // ignore
    }

    const title = flags.title || `egg-server-${this.pkg.name}`;
    const output = path.resolve(flags.output);

    // Ensure output directory exists
    await mkdir(path.dirname(output), { recursive: true });

    this.log('Building V8 startup snapshot for %s', frameworkName);
    this.log('  baseDir:   %s', baseDir);
    this.log('  framework: %s', frameworkPath);
    this.log('  env:       %s', flags.env);
    this.log('  port:      %d (default, overridable via PORT env)', flags.port);
    this.log('  output:    %s', output);
    this.log('');

    const snapshotOptions = JSON.stringify({
      baseDir,
      framework: frameworkPath,
      env: flags.env,
      port: flags.port,
      title,
    });

    // ── Stage 1: Generate snapshot entry ──────────────────────────────
    // Scans the egg app (plugins, framework, app code) to discover all
    // dynamically-loaded files, then generates a single ESM entry file with
    // static imports and a module registry for importModule() interception.
    this.log('[Stage 1/3] Generating snapshot entry...');
    const generateScript = path.join(import.meta.dirname, '../../scripts/generate-snapshot-entry.mjs');

    await this.spawnProcess(flags.node, [generateScript, snapshotOptions], {
      stdio: 'inherit',
      cwd: baseDir,
    });

    const entryPath = path.join(baseDir, 'dist/snapshot-entry.mjs');

    // ── Stage 2: Bundle to CJS with esbuild ──────────────────────────
    // node --build-snapshot forces CJS mode (minimalRunCjs in
    // node:internal/main/mksnapshot) and cannot load user-land modules.
    // We bundle everything into a single CJS file with all dependencies
    // inlined and only Node.js built-ins as external requires.
    this.log('');
    this.log('[Stage 2/3] Bundling snapshot entry to CJS...');
    const bundlePath = path.join(baseDir, 'dist/snapshot-bundle.cjs');

    await esbuildBundle({
      entryPoints: [entryPath],
      bundle: true,
      format: 'cjs',
      platform: 'node',
      target: 'node22',
      outfile: bundlePath,
      // Enable experimental decorators for tegg plugins that use parameter decorators.
      tsconfigRaw: JSON.stringify({
        compilerOptions: { experimentalDecorators: true, emitDecoratorMetadata: true },
      }),
      // platform: 'node' automatically externalizes node:* built-ins.
      // Also externalize native addons that cannot be bundled.
      external: ['fsevents', 'cpu-features'],
      logLevel: 'warning',
      // Inject CJS mode flag and Web API stubs at the very top of the bundle.
      // - __EGG_SNAPSHOT_CJS_BUNDLE__: forces importModule() to use require()
      //   instead of import(), avoiding ESM loader async hooks that corrupt
      //   the V8 snapshot builder.
      // - Request/Response/Headers stubs: prevent @hono/node-server from
      //   triggering Node.js built-in undici initialization (which uses
      //   WebAssembly, unavailable during --build-snapshot).
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

    this.log('  bundled: %s', bundlePath);

    // ── Stage 3: Build V8 snapshot ───────────────────────────────────
    // Run the bundled CJS file under --build-snapshot to serialize the
    // initialized application state into a V8 snapshot blob.
    this.log('');
    this.log('[Stage 3/3] Building V8 snapshot...');

    const buildArgs: string[] = [
      '--no-deprecation',
      '--trace-warnings',
      '--build-snapshot',
      `--snapshot-blob=${output}`,
      bundlePath,
    ];

    const env: Record<string, string | undefined> = {
      ...process.env,
      NODE_ENV: 'production',
      PATH: [
        path.join(baseDir, 'node_modules/.bin'),
        path.join(baseDir, '.node/bin'),
        process.env.PATH ?? process.env.Path,
      ]
        .filter(Boolean)
        .join(path.delimiter),
    };

    if (flags.env) {
      env.EGG_SERVER_ENV = flags.env;
    }

    debug('command: %s, args: %o', flags.node, buildArgs);
    this.log('Running: %s %s', flags.node, buildArgs.map((a) => `'${a}'`).join(' '));
    this.log('');

    await this.spawnProcess(flags.node, buildArgs, {
      env,
      stdio: 'inherit',
      cwd: baseDir,
    });

    this.log('');
    this.log('Snapshot built successfully: %s', output);
    this.log('');
    this.log('To start from this snapshot:');
    this.log('  %s start --snapshot --snapshot-blob %s', this.config.bin, path.relative(cwd, output) || output);
  }

  private spawnProcess(command: string, args: string[], options: SpawnOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      debug('spawn: %s %o', command, args);
      const child = spawn(command, args, options);
      child.on('exit', (code) => {
        if (code !== 0) {
          reject(this.error(`Command failed with exit code ${code}`));
        } else {
          resolve();
        }
      });
      child.on('error', reject);
    });
  }
}
