import { promises as fs } from 'node:fs';
import path from 'node:path';
import { debuglog } from 'node:util';

import { patchImportMetaInContent } from './importMetaPatch.ts';
import { PackRunner } from './PackRunner.ts';

const debug = debuglog('egg/bundler/standalone-worker');

export interface StandaloneManifestModule {
  readonly name: string;
  readonly unitPath: string;
  readonly decoratedFiles: readonly string[];
}

export interface StandaloneManifest {
  readonly moduleReferences: ReadonlyArray<{
    readonly name: string;
    readonly path: string;
    readonly [k: string]: unknown;
  }>;
  readonly moduleDescriptors: readonly StandaloneManifestModule[];
}

export interface StandaloneWorkerBundlerOptions {
  /** The app module directory (the tegg module scanned as the entry app). */
  readonly baseDir: string;
  /** Output directory for the bundled worker. */
  readonly outputDir: string;
  /**
   * The tegg manifest (moduleReferences + moduleDescriptors) produced by the
   * framework's scan-only metadata pass (e.g. `ServiceWorkerApp.loadMetadata`).
   * The bundler never boots the app; the caller supplies this.
   */
  readonly manifest: StandaloneManifest;
  /** Module specifier exporting the app class. Defaults to `@eggjs/service-worker`. */
  readonly appModule?: string;
  /** Named export of the app class on {@link appModule}. Defaults to `ServiceWorkerApp`. */
  readonly appExport?: string;
  /** Module names to drop from the manifest (e.g. `teggDal` — dynamic multiInstance loads break bundle mode). */
  readonly excludeModules?: readonly string[];
  /** Node monorepo/app root for @utoo/pack node_modules resolution. Defaults to baseDir. */
  readonly rootPath?: string;
  readonly mode?: 'production' | 'development';
}

export interface StandaloneWorkerBundleResult {
  readonly outputDir: string;
  /** The ESM module-worker entry (`export default { fetch }`), for `wrangler`'s `main`. */
  readonly entry: string;
}

// Under nodejs_compat these are provided by workerd; kept external so @utoo/pack
// emits a `require(id)` the runtime resolves rather than trying to bundle them.
const NODE_BUILTINS = [
  'assert',
  'async_hooks',
  'buffer',
  'crypto',
  'dns',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'querystring',
  'stream',
  'string_decoder',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'worker_threads',
  'zlib',
];

// Bundle mode never globs (the manifest lists every module file), and workerd's
// nodejs_compat has no `node:os`; both are aliased to inert stubs so their code
// (globby's dynamic `require('fs')`, egg-errors' `os.hostname/EOL`) leaves the bundle.
const STUB_GLOBBY = `const noop = () => [];
export default { sync: noop, globby: noop, globbySync: noop };
export const sync = noop; export const globby = noop; export const globbySync = noop;
`;
const STUB_OS = `export const EOL = '\\n';
export const hostname = () => 'workerd';
export const platform = () => 'workerd';
export const type = () => 'Workerd';
export const release = () => '';
export const arch = () => 'wasm32';
export const cpus = () => [];
export const totalmem = () => 0; export const freemem = () => 0;
export const loadavg = () => [0, 0, 0]; export const uptime = () => 0;
export const networkInterfaces = () => ({});
export const tmpdir = () => '/tmp'; export const homedir = () => '/';
export const userInfo = () => ({ username: 'workerd', homedir: '/' });
export default { EOL, hostname, platform, type, release, arch, cpus, totalmem, freemem, loadavg, uptime, networkInterfaces, tmpdir, homedir, userInfo };
`;

const posix = (p: string) => p.split(path.sep).join('/');

export class StandaloneWorkerBundler {
  readonly #options: StandaloneWorkerBundlerOptions;

  constructor(options: StandaloneWorkerBundlerOptions) {
    this.#options = options;
  }

  async run(): Promise<StandaloneWorkerBundleResult> {
    const {
      baseDir,
      outputDir,
      manifest,
      appModule = '@eggjs/service-worker',
      appExport = 'ServiceWorkerApp',
      excludeModules = [],
      rootPath,
      mode = 'production',
    } = this.#options;

    const absBaseDir = path.resolve(baseDir);
    const absOutputDir = path.resolve(absBaseDir, outputDir);
    const excluded = new Set(excludeModules);
    const filtered: StandaloneManifest = {
      moduleReferences: manifest.moduleReferences
        .filter((r) => !excluded.has(r.name))
        .map((r) => ({ ...r, path: posix(r.path) })),
      moduleDescriptors: manifest.moduleDescriptors
        .filter((d) => !excluded.has(d.name))
        .map((d) => ({ ...d, unitPath: posix(d.unitPath) })),
    };

    // Build-managed entry dir — a `.egg-bundle` sibling of the output dir (PackRunner
    // writes its compiler tsconfig here and requires a `.egg-bundle` path segment;
    // keeping it OUT of outputDir avoids @utoo/pack resolving the output into it).
    const entryDir = path.join(path.dirname(absOutputDir), '.egg-bundle', 'sw-entries');
    await fs.mkdir(entryDir, { recursive: true });
    const stubGlobby = path.join(entryDir, 'stub-globby.mjs');
    const stubOs = path.join(entryDir, 'stub-os.mjs');
    await fs.writeFile(stubGlobby, STUB_GLOBBY);
    await fs.writeFile(stubOs, STUB_OS);

    const entryFile = path.join(entryDir, 'worker.entry.ts');
    await fs.writeFile(entryFile, this.#renderEntry(filtered, entryDir, absBaseDir, appModule, appExport));
    debug('generated standalone worker entry: %s', entryFile);

    const externals: Record<string, string> = {};
    for (const b of NODE_BUILTINS) {
      externals[`node:${b}`] = `node:${b}`;
      externals[b] = b;
    }

    await new PackRunner({
      entries: [{ name: 'worker', filepath: entryFile }],
      outputDir: absOutputDir,
      externals,
      projectPath: entryDir,
      rootPath: rootPath ? path.resolve(absBaseDir, rootPath) : absBaseDir,
      mode,
      resolve: { alias: { globby: stubGlobby, os: stubOs, 'node:os': stubOs } },
      singleFile: true,
      // No ORM here: `false` erases uninitialized private fields (`#x?: T;`) while
      // code still references `this.#x`, producing "private name not declared".
      useDefineForClassFields: true,
    }).run();

    // Patch Turbopack's broken import.meta shim so bundled modules using
    // import.meta.url work (in Node and on workerd).
    const workerJs = path.join(absOutputDir, 'worker.js');
    const patched = patchImportMetaInContent(await fs.readFile(workerJs, 'utf8'));
    debug('patched %d import.meta occurrences', patched.patchCount);
    // The IIFE is CommonJS; give it a .cjs extension so the ESM wrapper can import it.
    const workerCjs = path.join(absOutputDir, 'worker.cjs');
    await fs.writeFile(workerCjs, patched.content);
    await fs.rm(workerJs, { force: true });

    // @utoo/pack single-file output is a self-executing CJS IIFE that exposes no
    // module export, so the entry stashes the worker on globalThis; this ESM
    // module-worker wrapper runs it (import side effect) then re-exports it.
    const entry = 'index.mjs';
    await fs.writeFile(
      path.join(absOutputDir, entry),
      "import './worker.cjs';\nexport default globalThis.__SW_WORKER__;\n",
    );

    return { outputDir: absOutputDir, entry };
  }

  #renderEntry(
    manifest: StandaloneManifest,
    entryDir: string,
    appDir: string,
    appModule: string,
    appExport: string,
  ): string {
    const files: string[] = [];
    for (const d of manifest.moduleDescriptors) {
      for (const f of d.decoratedFiles) files.push(posix(path.join(d.unitPath, f)));
    }
    // Relative specifier from the entry dir — @utoo/pack cannot resolve absolute paths.
    const rel = (abs: string) => {
      const r = posix(path.relative(entryDir, abs));
      return r.startsWith('.') ? r : `./${r}`;
    };
    const imports = files.map((abs, i) => `import * as __m${i} from ${JSON.stringify(rel(abs))};`).join('\n');
    const mapBody = files.map((abs, i) => `  [${JSON.stringify(abs)}]: __m${i},`).join('\n');

    return `// auto-generated by @eggjs/egg-bundler (standalone worker target)
import { ${appExport} } from ${JSON.stringify(appModule)};
${imports}

const __manifest = ${JSON.stringify(manifest)};
const __map = {
${mapBody}
};
globalThis.__EGG_BUNDLE_MODULE_LOADER__ = (p) => __map[p.split('\\\\').join('/')];

const __app = new ${appExport}(${JSON.stringify(posix(appDir))}, { manifest: __manifest });

// Single-file CJS output can't export; stash on globalThis for the ESM wrapper.
globalThis.__SW_WORKER__ = {
  fetch(request, _env, ctx) {
    return __app.handleEvent({ type: 'fetch', request, waitUntil: (p) => ctx.waitUntil(p) });
  },
};
`;
  }
}
