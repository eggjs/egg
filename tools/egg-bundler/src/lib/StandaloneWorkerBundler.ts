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
  /** The app module directory (the tegg module scanned for the manifest). */
  readonly baseDir: string;
  /**
   * Path to the user-authored worker entry (e.g. `worker.ts`). The bundler never
   * generates the host wiring — the user's entry constructs the app and picks the
   * host shape (`export default { fetch }` or `addEventListener`). The bundler only
   * injects the framework-scanned imports + manifest ahead of it (see {@link run}).
   */
  readonly entry: string;
  /** Output directory for the bundled worker. */
  readonly outputDir: string;
  /**
   * The tegg manifest (moduleReferences + moduleDescriptors) produced by the
   * framework's scan-only metadata pass (e.g. `ServiceWorkerApp.loadMetadata`).
   * The bundler never boots the app; the caller supplies this.
   */
  readonly manifest: StandaloneManifest;
  /**
   * Host format of the user's entry. `module` (default) emits an ESM wrapper that
   * re-exports the entry's `export default` (Cloudflare module worker); `service-worker`
   * emits a side-effect-only wrapper (the entry's `addEventListener('fetch')` ran
   * during evaluation — legacy service-worker format).
   */
  readonly format?: 'module' | 'service-worker';
  /** Module names to drop from the manifest (e.g. `teggDal` — dynamic multiInstance loads break bundle mode). */
  readonly excludeModules?: readonly string[];
  /** Node monorepo/app root for @utoo/pack node_modules resolution. Defaults to baseDir. */
  readonly rootPath?: string;
  readonly mode?: 'production' | 'development';
}

export interface StandaloneWorkerBundleResult {
  readonly outputDir: string;
  /** The ESM wrapper entry, for `wrangler`'s `main`. */
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
      entry,
      outputDir,
      manifest,
      format = 'module',
      excludeModules = [],
      rootPath,
      mode = 'production',
    } = this.#options;

    const absBaseDir = path.resolve(baseDir);
    const absOutputDir = path.resolve(absBaseDir, outputDir);
    const absEntry = path.resolve(entry);
    // The injected entry copy lives beside the user's entry so the user's own
    // relative imports and `import.meta` resolve exactly as they do unbundled.
    const userEntryDir = path.dirname(absEntry);

    const excluded = new Set(excludeModules);
    const filtered: StandaloneManifest = {
      moduleReferences: manifest.moduleReferences
        .filter((r) => !excluded.has(r.name))
        .map((r) => ({ ...r, path: posix(r.path) })),
      moduleDescriptors: manifest.moduleDescriptors
        .filter((d) => !excluded.has(d.name))
        .map((d) => ({ ...d, unitPath: posix(d.unitPath) })),
    };

    // Build-managed project dir — a `.egg-bundle` sibling of the output dir. PackRunner
    // writes its compiler tsconfig here and requires a `.egg-bundle` path segment; a
    // single projectPath tsconfig governs the whole build regardless of entry location,
    // so the injected entry can live next to the user's source instead.
    const projectDir = path.join(path.dirname(absOutputDir), '.egg-bundle', 'sw-entries');
    await fs.mkdir(projectDir, { recursive: true });
    const stubGlobby = path.join(projectDir, 'stub-globby.mjs');
    const stubOs = path.join(projectDir, 'stub-os.mjs');
    await fs.writeFile(stubGlobby, STUB_GLOBBY);
    await fs.writeFile(stubOs, STUB_OS);

    // The Turbopack entry = injected prelude + the user's entry content, copied beside
    // the user's source. The prelude sets the bundle-mode globals BEFORE the user body
    // runs (import declarations load first, then bodies run in source order), so the
    // user's plain `new ServiceWorkerApp(dir)` picks up the manifest with no build-only
    // import. The user's own `export default`/`addEventListener` is preserved verbatim.
    const userSource = await fs.readFile(absEntry, 'utf8');
    const injectedEntry = path.join(userEntryDir, '.egg-worker-entry.ts');
    await fs.writeFile(injectedEntry, `${this.#renderPrelude(filtered, userEntryDir)}\n${userSource}`);
    debug('generated injected worker entry: %s', injectedEntry);

    const externals: Record<string, string> = {};
    for (const b of NODE_BUILTINS) {
      externals[`node:${b}`] = `node:${b}`;
      externals[b] = b;
    }

    try {
      await new PackRunner({
        entries: [{ name: 'worker', filepath: injectedEntry }],
        outputDir: absOutputDir,
        externals,
        projectPath: projectDir,
        rootPath: rootPath ? path.resolve(absBaseDir, rootPath) : absBaseDir,
        mode,
        resolve: { alias: { globby: stubGlobby, os: stubOs, 'node:os': stubOs } },
        singleFile: true,
        // No ORM here: `false` erases uninitialized private fields (`#x?: T;`) while
        // code still references `this.#x`, producing "private name not declared".
        useDefineForClassFields: true,
      }).run();
    } finally {
      await fs.rm(injectedEntry, { force: true });
    }

    // Patch Turbopack's broken import.meta shim so bundled modules using
    // import.meta.url work (in Node and on workerd).
    const workerJs = path.join(absOutputDir, 'worker.js');
    const patched = patchImportMetaInContent(await fs.readFile(workerJs, 'utf8'));
    debug('patched %d import.meta occurrences', patched.patchCount);
    // The IIFE is CommonJS; give it a .cjs extension so the ESM wrapper can import it.
    const workerCjs = path.join(absOutputDir, 'worker.cjs');
    await fs.writeFile(workerCjs, patched.content);
    await fs.rm(workerJs, { force: true });

    // @utoo/pack single-file output is a self-executing CJS IIFE (no import/export)
    // that does `module.exports = <entry namespace>`.
    if (format === 'service-worker') {
      // Legacy service-worker format: the entry's `addEventListener('fetch')` ran on
      // the global scope when worker.cjs evaluated. It must stay a classic (non-module)
      // script — an ESM wrapper would move it to module scope, where workerd does not
      // dispatch fetch events — so `main` points straight at the CJS script.
      return { outputDir: absOutputDir, entry: 'worker.cjs' };
    }
    // Module worker: a thin ESM wrapper re-exports the entry's default so workerd sees
    // `export default { fetch }`.
    const wrapperName = 'index.mjs';
    await fs.writeFile(
      path.join(absOutputDir, wrapperName),
      "import worker from './worker.cjs';\nexport default worker.default;\n",
    );

    return { outputDir: absOutputDir, entry: wrapperName };
  }

  /**
   * The injected prelude: static-import every decorated file so @utoo/pack bundles
   * it, then install the bundle-mode globals the standalone loader reads.
   */
  #renderPrelude(manifest: StandaloneManifest, entryDir: string): string {
    const files: string[] = [];
    for (const d of manifest.moduleDescriptors) {
      for (const f of d.decoratedFiles) files.push(posix(path.join(d.unitPath, f)));
    }
    // Relative specifier from the injected entry dir — @utoo/pack cannot resolve absolute paths.
    const rel = (abs: string) => {
      const r = posix(path.relative(entryDir, abs));
      return r.startsWith('.') ? r : `./${r}`;
    };
    const imports = files.map((abs, i) => `import * as __m${i} from ${JSON.stringify(rel(abs))};`).join('\n');
    const mapBody = files.map((abs, i) => `  [${JSON.stringify(abs)}]: __m${i},`).join('\n');

    return `// auto-generated by @eggjs/egg-bundler (standalone worker prelude)
${imports}

const __egg_bundle_map = {
${mapBody}
};
globalThis.__EGG_BUNDLE_MODULE_LOADER__ = (p) => __egg_bundle_map[p.split('\\\\').join('/')];
globalThis.__EGG_BUNDLE_MANIFEST__ = ${JSON.stringify(manifest)};
`;
  }
}
