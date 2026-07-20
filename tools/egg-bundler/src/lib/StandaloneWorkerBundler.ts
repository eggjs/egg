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
  /** Application module directory. */
  readonly baseDir: string;
  /** User-authored worker entry. */
  readonly entry: string;
  /** Output directory for the bundled worker. */
  readonly outputDir: string;
  /** Tegg metadata produced by the standalone framework scan. */
  readonly manifest: StandaloneManifest;
  /** `module` emits an ESM worker; `service-worker` emits a classic script. */
  readonly format?: 'module' | 'service-worker';
  /** Module names to omit from the bundle. */
  readonly excludeModules?: readonly string[];
  /** Node monorepo/app root for @utoo/pack node_modules resolution. Defaults to baseDir. */
  readonly rootPath?: string;
  readonly mode?: 'production' | 'development';
}

export interface StandaloneWorkerBundleResult {
  readonly outputDir: string;
  /** Generated worker entry filename. */
  readonly entry: string;
}

// workerd provides these through nodejs_compat.
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

// These APIs are unreachable in bundle mode and unavailable in workerd.
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
    // Keep the injected copy beside the entry to preserve relative resolution.
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

    // PackRunner owns the compiler configuration under .egg-bundle.
    const projectDir = path.join(path.dirname(absOutputDir), '.egg-bundle', 'sw-entries');
    await fs.mkdir(projectDir, { recursive: true });
    const stubGlobby = path.join(projectDir, 'stub-globby.mjs');
    const stubOs = path.join(projectDir, 'stub-os.mjs');
    await fs.writeFile(stubGlobby, STUB_GLOBBY);
    await fs.writeFile(stubOs, STUB_OS);

    // Static imports load before the entry reads the injected manifest globals.
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
        // Preserve private field declarations in the worker output.
        useDefineForClassFields: true,
      }).run();
    } finally {
      await fs.rm(injectedEntry, { force: true });
    }

    // Replace Turbopack's unusable import.meta shim.
    const workerJs = path.join(absOutputDir, 'worker.js');
    const patched = patchImportMetaInContent(await fs.readFile(workerJs, 'utf8'));
    debug('patched %d import.meta occurrences', patched.patchCount);
    // The generated IIFE is CommonJS.
    const workerCjs = path.join(absOutputDir, 'worker.cjs');
    await fs.writeFile(workerCjs, patched.content);
    await fs.rm(workerJs, { force: true });

    if (format === 'service-worker') {
      // Classic workers execute the CommonJS artifact for its global side effects.
      return { outputDir: absOutputDir, entry: 'worker.cjs' };
    }
    // Module workers require a default ESM export.
    const wrapperName = 'index.mjs';
    await fs.writeFile(
      path.join(absOutputDir, wrapperName),
      "import worker from './worker.cjs';\nexport default worker.default;\n",
    );

    return { outputDir: absOutputDir, entry: wrapperName };
  }

  /** Render static module imports and the manifest globals. */
  #renderPrelude(manifest: StandaloneManifest, entryDir: string): string {
    const files: string[] = [];
    for (const d of manifest.moduleDescriptors) {
      for (const f of d.decoratedFiles) files.push(posix(path.join(d.unitPath, f)));
    }
    // @utoo/pack requires module specifiers relative to the entry.
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
