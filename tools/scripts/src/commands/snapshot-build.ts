import { spawn, type SpawnOptions } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
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
 * we replace urllib with a minimal stub. At snapshot restore time,
 * `registerSnapshotCallbacks()` patches in the real urllib.
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
 * native handles that V8 cannot serialize into a startup snapshot.
 * This plugin replaces it with a lazy Proxy that defers loading until
 * first property access at restore time.
 */
function httpDeferPlugin(): EsbuildPlugin {
  return {
    name: 'http-defer',
    setup(build) {
      build.onResolve({ filter: /^(node:)?http$/ }, (args) => {
        if (args.path !== 'http' && args.path !== 'node:http') return null;
        if (args.namespace === 'http-defer') return { path: 'node:http', external: true };
        return { path: 'node:http', namespace: 'http-defer' };
      });
      build.onLoad({ filter: /.*/, namespace: 'http-defer' }, () => ({
        contents: `
          let _real;
          function getReal() {
            if (!_real) _real = require('node:http');
            return _real;
          }
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
          const STATIC = { METHODS, STATUS_CODES };
          module.exports = new Proxy({}, {
            get(_, prop) {
              if (prop === '__esModule') return false;
              if (prop === 'default') return module.exports;
              if (prop in STATIC) return STATIC[prop];
              return getReal()[prop];
            },
            set(_, prop, value) { getReal()[prop] = value; return true; },
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
 * Pure transformation for ESM polyfill. Exported for unit testing.
 *
 * Returns the modified source, or `null` if the file is CJS (no ESM
 * markers) or needs no changes. Detects ESM by presence of `import.meta.`
 * or a top-level `import`/`export` statement — CJS files (e.g. files
 * using `module.exports` and `require`) are left untouched.
 *
 * Replacements:
 * - `import.meta.dirname`/`url`/`filename` → literal strings baked at
 *   build time using the original source path
 * - `__dirname` → literal absolute dirname of the original source
 *
 * Deliberately does NOT touch `__filename`: ESM sources often contain
 * `const __filename = fileURLToPath(import.meta.url)` as a CJS-compat
 * fallback (e.g. koa-onerror), and a literal substitution would turn
 * the declaration into `const "/path" = ...` (syntax error). The
 * `__dirname` form `const __dirname = path.dirname(__filename)` does
 * not appear in our runtime dependency tree.
 */
export function applyEsmPolyfill(contents: string, absPath: string): string | null {
  const isESM = contents.includes('import.meta.') || /^(?:import|export)\s/m.test(contents);
  if (!isESM) return null;

  const dirname = path.dirname(absPath);
  const url = pathToFileURL(absPath).href;

  const modified = contents
    .replace(/\bimport\.meta\.dirname\b/g, JSON.stringify(dirname))
    .replace(/\bimport\.meta\.url\b/g, JSON.stringify(url))
    .replace(/\bimport\.meta\.filename\b/g, JSON.stringify(absPath))
    .replace(/\b__dirname\b/g, JSON.stringify(dirname));

  return modified === contents ? null : modified;
}

/**
 * esbuild plugin: polyfill ESM-only constructs (`import.meta.*`,
 * `__dirname`) for CJS snapshot output. See {@link applyEsmPolyfill}.
 */
function esmPolyfillPlugin(): EsbuildPlugin {
  return {
    name: 'esm-polyfill',
    setup(build) {
      build.onLoad({ filter: /\.(ts|js|mjs|cjs)$/ }, async (args) => {
        const contents = await fs.readFile(args.path, 'utf8');
        const modified = applyEsmPolyfill(contents, args.path);
        if (modified === null) return null;

        const ext = path.extname(args.path);
        const loader = ext === '.ts' ? ('ts' as const) : ('js' as const);
        return { contents: modified, loader };
      });
    },
  };
}

// ── Manifest-based entry generation ──────────────────────────────────

interface Manifest {
  resolveCache: Record<string, string | null>;
  fileDiscovery: Record<string, string[]>;
}

/**
 * Resolve the framework's main entry file from its package.json.
 *
 * Supports multiple layouts:
 * - Worktree/monorepo: `src/index.ts` (preferred when present)
 * - Installed CJS: `dist/index.js` (via `main`)
 * - Installed ESM/dual: resolved via `exports['.']`
 *
 * Returns the entry path plus all keys that should map to the framework
 * module in the snapshot registry (so runtime lookups by either the
 * package directory or the resolved entry file both hit).
 */
export function resolveFrameworkEntry(frameworkPath: string): { entryPath: string; registryKeys: string[] } {
  const keys: string[] = [frameworkPath];

  // Worktree/monorepo layout: prefer .ts source directly
  const srcEntry = path.join(frameworkPath, 'src/index.ts');
  if (existsSync(srcEntry)) {
    keys.push(srcEntry, path.join(frameworkPath, 'src'));
    return { entryPath: srcEntry, registryKeys: keys };
  }

  // Installed layout: read package.json
  const pkgPath = path.join(frameworkPath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  let relEntry: string | undefined;
  const dotExport = pkg.exports?.['.'];
  if (typeof dotExport === 'string') {
    relEntry = dotExport;
  } else if (dotExport && typeof dotExport === 'object') {
    // conditional exports — try common conditions in priority order
    const pick = (v: unknown): string | undefined => {
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        return pick(o.import) ?? pick(o.node) ?? pick(o.default) ?? pick(o.require);
      }
      return undefined;
    };
    relEntry = pick(dotExport);
  }
  relEntry ??= pkg.main ?? 'index.js';

  const entryPath = path.resolve(frameworkPath, relEntry as string);
  if (!existsSync(entryPath)) {
    throw new Error(
      `Framework entry not found: ${entryPath} (resolved from ${pkgPath}). ` +
        'Ensure the package is built and has a valid "main" or "exports" field.',
    );
  }
  keys.push(entryPath);
  const entryDir = path.dirname(entryPath);
  if (entryDir !== frameworkPath) keys.push(entryDir);

  return { entryPath, registryKeys: keys };
}

/**
 * Generate an ESM snapshot entry file from the manifest.
 *
 * Reads `.egg/manifest.json`, collects all resolved module paths, and
 * generates a single ESM file that:
 * 1. Static `import * as __mod_N` for every resolved module
 * 2. Builds a Map<absolutePath, moduleExports>
 * 3. Calls `setSnapshotModuleLoader()` from @eggjs/utils
 */
function generateEntrySource(manifest: Manifest, baseDir: string, frameworkPath?: string): string {
  // Collect all unique resolved file paths from manifest
  const resolvedPaths = new Set<string>();

  for (const resolved of Object.values(manifest.resolveCache)) {
    if (resolved !== null) {
      resolvedPaths.add(resolved);
    }
  }

  for (const [dir, files] of Object.entries(manifest.fileDiscovery)) {
    for (const file of files) {
      resolvedPaths.add(path.posix.join(dir, file));
    }
  }

  // Resolve relative paths to absolute, verify existence
  const moduleEntries: { absPath: string }[] = [];
  const seen = new Set<string>();

  for (const relPath of resolvedPaths) {
    const absPath = path.resolve(baseDir, relPath);
    if (seen.has(absPath)) continue;
    seen.add(absPath);

    if (!existsSync(absPath)) {
      debug('[entry-gen] WARNING: file not found, skipping: %s', absPath);
      continue;
    }

    moduleEntries.push({ absPath });
  }

  debug('[entry-gen] unique modules to import: %d', moduleEntries.length);

  // Resolve @eggjs/utils path for the setSnapshotModuleLoader import
  let eggUtilsImport: string;
  try {
    eggUtilsImport = import.meta.resolve('@eggjs/utils');
  } catch {
    // Fallback: look relative to framework path
    if (frameworkPath) {
      const candidate = path.resolve(frameworkPath, '../utils/src/index.ts');
      if (existsSync(candidate)) {
        eggUtilsImport = pathToFileURL(candidate).href;
      }
    }
    eggUtilsImport ??= '@eggjs/utils';
  }

  const lines: string[] = [
    '// AUTO-GENERATED by eggctl snapshot-build',
    '// Do not edit manually.',
    '',
    `import { setSnapshotModuleLoader } from ${JSON.stringify(eggUtilsImport)};`,
    '',
  ];

  // Optionally import the framework
  let frameworkEntry: string | undefined;
  let frameworkRegistryKeys: string[] = [];
  if (frameworkPath) {
    const resolved = resolveFrameworkEntry(frameworkPath);
    frameworkEntry = resolved.entryPath;
    frameworkRegistryKeys = resolved.registryKeys;
    lines.push(`import * as framework from ${JSON.stringify(pathToFileURL(frameworkEntry).href)};`);
    lines.push('');
  }

  // Static imports for all manifest modules
  lines.push('// === Pre-imported modules (discovered from manifest) ===');
  lines.push('');

  for (let i = 0; i < moduleEntries.length; i++) {
    const url = pathToFileURL(moduleEntries[i].absPath).href;
    lines.push(`import * as __mod_${i} from ${JSON.stringify(url)};`);
  }

  lines.push('');
  lines.push('// === Module registry ===');
  lines.push('');
  lines.push('const __moduleRegistry = new Map();');
  lines.push('');

  // Register framework under multiple resolution keys
  if (frameworkPath) {
    lines.push('// Framework entry');
    for (const p of frameworkRegistryKeys) {
      lines.push(`__moduleRegistry.set(${JSON.stringify(p)}, framework);`);
    }
    lines.push('');
  }

  // Register all manifest modules
  lines.push('// Manifest modules');
  for (let i = 0; i < moduleEntries.length; i++) {
    lines.push(`__moduleRegistry.set(${JSON.stringify(moduleEntries[i].absPath)}, __mod_${i});`);
  }

  lines.push('');
  lines.push('// === Snapshot module loader ===');
  lines.push('');
  lines.push('setSnapshotModuleLoader((resolvedPath) => {');
  lines.push('  const mod = __moduleRegistry.get(resolvedPath);');
  lines.push('  if (mod !== undefined) return mod;');
  lines.push('  console.warn("[snapshot-entry] module not in registry:", resolvedPath);');
  lines.push('  return undefined;');
  lines.push('});');
  lines.push('');
  lines.push('// === Deserialize main function (runs after snapshot restore) ===');
  lines.push('');
  lines.push('import { startupSnapshot } from "node:v8";');
  lines.push('');
  lines.push('startupSnapshot.setDeserializeMainFunction(async () => {');
  lines.push('  const http = require("node:http");');
  lines.push(`  const frameworkMod = __moduleRegistry.get(${JSON.stringify(frameworkEntry ?? '')}) || framework;`);
  lines.push('  const startEgg = frameworkMod.start ?? frameworkMod.startEgg;');
  lines.push('  if (typeof startEgg !== "function") {');
  lines.push('    throw new Error("Cannot find start/startEgg in snapshot framework module");');
  lines.push('  }');
  lines.push('  const app = await startEgg({');
  lines.push(`    baseDir: ${JSON.stringify(baseDir)},`);
  if (frameworkPath) {
    lines.push(`    framework: ${JSON.stringify(frameworkPath)},`);
  }
  lines.push('    env: process.env.EGG_SERVER_ENV || "prod",');
  lines.push('    mode: "single",');
  lines.push('  });');
  lines.push('');
  lines.push('  const port = parseInt(process.env.PORT) || 7001;');
  lines.push('  const server = http.createServer(app.callback());');
  lines.push('  app.emit("server", server);');
  lines.push('');
  lines.push('  await new Promise((resolve, reject) => {');
  lines.push('    server.listen(port, () => resolve());');
  lines.push('    server.once("error", reject);');
  lines.push('  });');
  lines.push('');
  lines.push('  const address = server.address();');
  lines.push('  const url = typeof address === "string" ? address : `http://127.0.0.1:${address.port}`;');
  lines.push('  process.title = process.env.EGG_SERVER_TITLE || "egg-server";');
  lines.push('');
  lines.push('  if (process.send) {');
  lines.push('    process.send({ action: "egg-ready", data: { address: url, port: address.port ?? port } });');
  lines.push('  }');
  lines.push('');
  lines.push('  const shutdown = (signal) => {');
  lines.push('    server.close(() => {');
  lines.push('      if (typeof app.close === "function") {');
  lines.push('        app.close().then(() => process.exit(0)).catch(() => process.exit(1));');
  lines.push('      } else {');
  lines.push('        process.exit(0);');
  lines.push('      }');
  lines.push('    });');
  lines.push('    setTimeout(() => process.exit(1), 10000).unref();');
  lines.push('  };');
  lines.push('  process.once("SIGTERM", () => shutdown("SIGTERM"));');
  lines.push('  process.once("SIGINT", () => shutdown("SIGINT"));');
  lines.push('  process.once("SIGQUIT", () => shutdown("SIGQUIT"));');
  lines.push('});');
  lines.push('');

  return lines.join('\n');
}

// ── Command ──────────────────────────────────────────────────────────

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

    const frameworkPath = getFrameworkPath({
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

    const output = path.resolve(flags.output);

    await fs.mkdir(path.dirname(output), { recursive: true });

    this.log('Building V8 startup snapshot for %s', frameworkName);
    this.log('  baseDir:   %s', baseDir);
    this.log('  framework: %s', frameworkPath);
    this.log('  env:       %s', flags.env);
    this.log('  port:      %d (default, overridable via PORT env)', flags.port);
    this.log('  output:    %s', output);
    this.log('');

    // ── Stage 1: Generate snapshot entry from manifest ───────────────
    this.log('[Stage 1/3] Generating snapshot entry from manifest...');

    const manifestPath = path.join(baseDir, '.egg', 'manifest.json');
    if (!existsSync(manifestPath)) {
      this.error(
        `Manifest not found: ${manifestPath}\n` + 'Run "egg-bin manifest generate" first to generate the manifest.',
      );
    }

    const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    this.log('  manifest: %s', manifestPath);
    this.log('  resolveCache entries: %d', Object.keys(manifest.resolveCache).length);
    this.log('  fileDiscovery entries: %d', Object.keys(manifest.fileDiscovery).length);

    const entrySource = generateEntrySource(manifest, baseDir, frameworkPath);

    const entryDir = path.join(baseDir, '.egg');
    await fs.mkdir(entryDir, { recursive: true });
    const entryPath = path.join(entryDir, 'snapshot-entry.mjs');
    await fs.writeFile(entryPath, entrySource);

    const importCount = (entrySource.match(/^import \* as __mod_/gm) || []).length;
    this.log('  entry written: %s (%d static imports)', entryPath, importCount);

    // ── Stage 2: Bundle to CJS with esbuild ──────────────────────────
    this.log('');
    this.log('[Stage 2/3] Bundling snapshot entry to CJS...');
    const bundlePath = path.join(baseDir, '.egg', 'snapshot-bundle.cjs');

    await esbuildBundle({
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
          // Delete the Web API lazy getters to prevent Node.js built-in undici
          // initialization (which uses WebAssembly, unavailable during --build-snapshot).
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
        esmPolyfillPlugin(),
      ],
    });

    this.log('  bundled: %s', bundlePath);

    // ── Stage 3: Build V8 snapshot ───────────────────────────────────
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
