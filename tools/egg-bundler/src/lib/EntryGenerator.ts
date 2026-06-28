import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { debuglog } from 'node:util';

import type { StartupManifest } from '@eggjs/core';

import { assertFrameworkPackageSpecifier } from './frameworkSpecifier.ts';
import type { ManifestLoader } from './ManifestLoader.ts';

const debug = debuglog('egg/bundler/entry-generator');

export interface EntryGeneratorOptions {
  baseDir: string;
  manifestLoader: ManifestLoader;
  outputDir?: string;
  framework?: string;
  externals?: ReadonlySet<string>;
}

export interface GeneratedEntries {
  workerEntry: string;
  entryDir: string;
}

interface BundleEntry {
  /** posix path relative to the runtime baseDir, e.g. "app/controller/home.ts" or "node_modules/@eggjs/static/app/middleware/static.ts" */
  relKey: string;
  /** absolute path at bundle time, used in the static `import` statement so @utoo/pack can reach the module */
  absBundle: string;
  /** when true, this entry belongs to an externalized package and must not be statically imported */
  external?: boolean;
  /** bare package specifier with subpath for runtime require(), e.g. "@eggjs/onerror/config/config.default" */
  bareSpecifier?: string;
}

interface TeggModuleDescriptor {
  unitPath: string;
  decoratedFiles?: string[];
}

interface TeggManifestExtension {
  moduleDescriptors?: TeggModuleDescriptor[];
}

export class EntryGenerator {
  readonly #baseDir: string;
  readonly #loader: ManifestLoader;
  readonly #outputDir: string;
  readonly #framework: string;
  readonly #externals: ReadonlySet<string>;

  constructor(options: EntryGeneratorOptions) {
    this.#baseDir = options.baseDir;
    this.#loader = options.manifestLoader;
    this.#outputDir = options.outputDir ?? path.join(options.baseDir, '.egg-bundle', 'entries');
    this.#framework = options.framework ?? 'egg';
    assertFrameworkPackageSpecifier(this.#framework);
    this.#externals = options.externals ?? new Set();
  }

  async generate(): Promise<GeneratedEntries> {
    const manifest = await this.#loader.load();
    const entries = this.#collectBundleEntries(manifest);
    debug('collected %d bundle entries', entries.length);

    await fs.mkdir(this.#outputDir, { recursive: true });

    const workerEntry = path.join(this.#outputDir, 'worker.entry.ts');

    await fs.writeFile(workerEntry, this.#renderWorkerEntry(entries, manifest));

    return {
      workerEntry,
      entryDir: this.#outputDir,
    };
  }

  #collectBundleEntries(manifest: StartupManifest): BundleEntry[] {
    const map = new Map<string, BundleEntry>();

    // 1. Every file discovered during loading
    for (const [relDir, files] of Object.entries(manifest.fileDiscovery)) {
      for (const file of files) {
        this.#addEntry(map, this.#joinPosix(relDir, file));
      }
    }

    // 2. Every non-null resolveCache target (extensions, plugin app.ts, middlewares…)
    for (const value of Object.values(manifest.resolveCache)) {
      if (value) this.#addEntry(map, value);
    }

    // 3. Tegg decorated files (unitPath is either absolute or node_modules-normalized)
    const tegg = manifest.extensions?.tegg as TeggManifestExtension | undefined;
    if (tegg?.moduleDescriptors) {
      for (const desc of tegg.moduleDescriptors) {
        for (const rel of desc.decoratedFiles ?? []) {
          const relKey = this.#teggRelKey(desc.unitPath, rel);
          if (relKey) this.#addEntry(map, relKey);
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.relKey < b.relKey) return -1;
      if (a.relKey > b.relKey) return 1;
      return 0;
    });
  }

  #addEntry(map: Map<string, BundleEntry>, relKey: string): void {
    const normalized = relKey.replaceAll(path.sep, '/');
    if (map.has(normalized)) return;
    const absBundle = this.#absFromRelKey(normalized);
    const entry: BundleEntry = { relKey: normalized, absBundle };

    const pkgInfo = this.#extractPackageInfo(normalized);
    if (pkgInfo && this.#externals.has(pkgInfo.name)) {
      entry.external = true;
      entry.bareSpecifier = pkgInfo.subpath ? `${pkgInfo.name}/${pkgInfo.subpath}` : pkgInfo.name;
    }

    map.set(normalized, entry);
  }

  #extractPackageInfo(relKey: string): { name: string; subpath: string } | undefined {
    if (!relKey.startsWith('node_modules/')) return undefined;
    const rest = relKey.slice('node_modules/'.length);
    const slashIdx = rest.startsWith('@') ? rest.indexOf('/', rest.indexOf('/') + 1) : rest.indexOf('/');
    if (slashIdx === -1) return { name: rest, subpath: '' };
    const name = rest.slice(0, slashIdx);
    let subpath = rest.slice(slashIdx + 1);
    // Strip dist/ prefix and only known-safe runtime extensions for bare specifier resolution.
    // Preserve significant extensions such as .cjs/.mjs and multi-part names like .d.ts.
    // e.g. "dist/config/config.default.js" → "config/config.default"
    subpath = subpath.replace(/^dist\//, '');
    if (subpath.endsWith('.js')) {
      subpath = subpath.slice(0, -'.js'.length);
    }
    return { name, subpath };
  }

  #absFromRelKey(relKey: string): string {
    if (path.isAbsolute(relKey)) return relKey;
    if (relKey.startsWith('node_modules/')) {
      const req = createRequire(path.join(this.#baseDir, 'package.json'));
      const rest = relKey.slice('node_modules/'.length);
      const slashIdx = rest.startsWith('@') ? rest.indexOf('/', rest.indexOf('/') + 1) : rest.indexOf('/');
      const pkgName = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
      const sub = slashIdx === -1 ? '' : rest.slice(slashIdx + 1);
      try {
        const pkgJson = req.resolve(`${pkgName}/package.json`);
        return path.resolve(path.dirname(pkgJson), sub);
      } catch {
        return path.resolve(this.#baseDir, relKey);
      }
    }
    return path.resolve(this.#baseDir, relKey);
  }

  #teggRelKey(unitPath: string, rel: string): string | undefined {
    if (path.isAbsolute(unitPath)) {
      const abs = path.resolve(unitPath, rel);
      const relToBase = path.relative(this.#baseDir, abs).replaceAll(path.sep, '/');
      if (!relToBase || relToBase.startsWith('..')) return undefined;
      return relToBase;
    }
    return this.#joinPosix(unitPath, rel);
  }

  #joinPosix(...parts: string[]): string {
    return parts
      .filter(Boolean)
      .map((p) => p.replaceAll(path.sep, '/'))
      .join('/')
      .replaceAll(/\/+/g, '/');
  }

  /**
   * The baseDir-relative keys of every tegg decorated file, used at runtime to
   * re-stamp the correct `filePath` on decorated classes (whose decorator-captured
   * path is unreliable in a bundle — see the worker entry comment).
   */
  #collectDecoratedFileKeys(manifest: StartupManifest): string[] {
    const tegg = manifest.extensions?.tegg as TeggManifestExtension | undefined;
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const desc of tegg?.moduleDescriptors ?? []) {
      for (const rel of desc.decoratedFiles ?? []) {
        const relKey = this.#teggRelKey(desc.unitPath, rel);
        const normalized = relKey?.replaceAll(path.sep, '/');
        if (normalized && !seen.has(normalized)) {
          seen.add(normalized);
          keys.push(normalized);
        }
      }
    }
    return keys;
  }

  #collectResolveCacheAliases(manifest: StartupManifest): Array<[string, string]> {
    const aliases: Array<[string, string]> = [];
    for (const [requestRel, targetRel] of Object.entries(manifest.resolveCache)) {
      if (typeof targetRel !== 'string') continue;
      for (const requestAbs of this.#absoluteAliasKeys(requestRel)) {
        aliases.push([requestAbs, targetRel]);
      }
    }
    return this.#uniqueAliasPairs(aliases).sort(([left], [right]) => left.localeCompare(right));
  }

  #normalizeKey(filepath: string): string {
    return filepath.replaceAll(path.sep, '/');
  }

  #absoluteAliasKeys(relKey: string): string[] {
    const keys = new Set<string>();
    keys.add(this.#normalizeKey(this.#absFromRelKey(relKey)));
    if (!path.isAbsolute(relKey)) {
      keys.add(this.#normalizeKey(path.resolve(this.#baseDir, relKey)));
    }
    return [...keys];
  }

  #uniqueAliasPairs(pairs: Array<[string, string]>): Array<[string, string]> {
    const seen = new Set<string>();
    const unique: Array<[string, string]> = [];
    for (const pair of pairs) {
      const key = JSON.stringify(pair);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(pair);
    }
    return unique;
  }

  #renderWorkerEntry(entries: BundleEntry[], manifest: StartupManifest): string {
    const importLines: string[] = [];
    const mapLines: string[] = [];
    const externalSpecs: Array<[string, string]> = [];

    let internalIdx = 0;
    for (const entry of entries) {
      if (entry.external && entry.bareSpecifier) {
        externalSpecs.push([entry.relKey, entry.bareSpecifier]);
      } else {
        const specifier = this.#toImportSpecifier(entry.absBundle);
        importLines.push(`import * as __m${internalIdx} from ${JSON.stringify(specifier)};`);
        mapLines.push(`  [${JSON.stringify(entry.relKey)}]: __m${internalIdx},`);
        internalIdx++;
      }
    }

    const manifestJson = JSON.stringify(manifest, null, 2);
    const appAbsoluteAliases = JSON.stringify(
      this.#uniqueAliasPairs(
        entries.flatMap((entry) => this.#absoluteAliasKeys(entry.relKey).map((abs) => [abs, entry.relKey])),
      ),
    );
    const appResolveCacheAliases = JSON.stringify(this.#collectResolveCacheAliases(manifest));
    const decoratedFileKeys = JSON.stringify(this.#collectDecoratedFileKeys(manifest));
    const frameworkSpec = JSON.stringify(this.#framework);

    const externalBlock =
      externalSpecs.length > 0
        ? `
// External-package files: loaded at runtime via require(), not bundled.
// Uses createRequire + dynamic specifiers so @utoo/pack cannot trace them.
import { createRequire as __createRequire } from 'node:module';
const __rtReq = __createRequire(path.join(__outputDir, 'package.json'));
const __EXTERNAL_SPECS: Array<[string, string]> = ${JSON.stringify(externalSpecs)};
for (const [key, spec] of __EXTERNAL_SPECS) {
  __BUNDLE_MAP_REL[key] = __rtReq(spec);
}
`
        : '';

    return `// ⚠️ auto-generated by @eggjs/egg-bundler — do not edit
/* eslint-disable */
import path from 'node:path';
import v8 from 'node:v8';

import { ManifestLoaderFS, ManifestStore } from '@eggjs/core';
import type {} from '@eggjs/typings/global';
import { startEgg } from ${frameworkSpec};
import * as __frameworkModule from ${frameworkSpec};

${importLines.join('\n')}

// Derive the runtime output directory from the entry file being executed.
// Cannot use __dirname because turbopack replaces it with the compile-time
// path of the INPUT file, not the OUTPUT directory.
const __outputDir = path.dirname(path.resolve(process.argv[1] || '.'));
const __framework = ${frameworkSpec};

const MANIFEST_DATA = ${manifestJson} as const;
const __APP_ABSOLUTE_ALIASES: Array<[string, string]> = ${appAbsoluteAliases};
const __APP_RESOLVE_CACHE_ALIASES: Array<[string, string]> = ${appResolveCacheAliases};

const __BUNDLE_MAP_REL: Record<string, unknown> = {
${mapLines.join('\n')}
};
${externalBlock}
const __BUNDLE_MAP: Record<string, unknown> = {};
const __normalizeBundleKey = (filepath: string) => filepath.split(path.sep).join('/');
const __setBundleMap = (filepath: string, mod: unknown) => {
  __BUNDLE_MAP[__normalizeBundleKey(filepath)] = mod;
};
const __getBundleMap = (filepath: string) => __BUNDLE_MAP[__normalizeBundleKey(filepath)];
const __setBundleAliases = (rel: string, mod: unknown) => {
  __setBundleMap(rel, mod);
  if (!path.isAbsolute(rel)) {
    __setBundleMap(path.resolve(__outputDir, rel), mod);
  }
};
__setBundleMap(__framework, __frameworkModule);
for (const [rel, mod] of Object.entries(__BUNDLE_MAP_REL)) {
  __setBundleAliases(rel, mod);
}
for (const [appAbs, targetRel] of __APP_ABSOLUTE_ALIASES) {
  const mod = __getBundleMap(targetRel);
  if (mod !== undefined) {
    __setBundleMap(appAbs, mod);
  }
}
for (const [requestRel, targetRel] of Object.entries(MANIFEST_DATA.resolveCache)) {
  if (!targetRel) continue;
  const mod = __getBundleMap(targetRel) ?? __getBundleMap(path.resolve(__outputDir, targetRel));
  if (mod !== undefined) {
    __setBundleAliases(requestRel, mod);
  }
}
for (const [appAbsRequest, targetRel] of __APP_RESOLVE_CACHE_ALIASES) {
  const mod = __getBundleMap(targetRel);
  if (mod !== undefined) {
    __setBundleMap(appAbsRequest, mod);
  }
}

// ── decorator file-path correction ──────────────────────────────────────────
// tegg decorators (@SingletonProto/@HTTPController/@Advice/…) capture a class's
// source path from the CALL STACK at module evaluation, via
// StackUtil.getCalleeFromStack(depth) with a hardcoded frame index. In a bundle
// every user frame collapses onto worker.js plus turbopack module wrappers, so a
// decorator that uses a deeper index than the norm — notably @Advice's depth-5 vs
// @SingletonProto's depth-4 — captures the runtime frame ("…/worker.js") instead
// of its own source file. tegg then cannot match that proto to its load unit and
// fails at restore with "Aop Advice(X) not found in loadUnits".
//
// The bundle DOES know each decorated file's real path (the manifest's tegg
// decoratedFiles, surfaced here as __DECORATED_FILE_KEYS). Re-stamp the correct
// path (outputDir + relKey, matching the format the well-behaved decorators get)
// on every decorated export, overriding whatever the decorator captured. This runs
// at build, so the corrected paths are baked into the snapshot the restore reads.
const __DECORATED_FILE_KEYS: string[] = ${decoratedFileKeys};
{
  const __FILE_PATH_META = Symbol.for('EggPrototype.filePath');
  const __reflect = Reflect as unknown as {
    hasOwnMetadata?: (key: symbol, target: unknown) => boolean;
    defineMetadata?: (key: symbol, value: unknown, target: unknown) => void;
  };
  if (typeof __reflect.hasOwnMetadata === 'function' && typeof __reflect.defineMetadata === 'function') {
    for (const __rel of __DECORATED_FILE_KEYS) {
      const __mod = __getBundleMap(__rel) as Record<string, unknown> | undefined;
      if (!__mod || (typeof __mod !== 'object' && typeof __mod !== 'function')) continue;
      const __abs = path.resolve(__outputDir, __rel);
      for (const __k of Object.keys(__mod)) {
        const __exported = __mod[__k];
        if (
          __exported &&
          (typeof __exported === 'function' || typeof __exported === 'object') &&
          __reflect.hasOwnMetadata(__FILE_PATH_META, __exported)
        ) {
          __reflect.defineMetadata(__FILE_PATH_META, __abs, __exported);
        }
      }
    }
  }
}

// Tegg module reference / descriptor paths are stored relative to baseDir in the
// manifest. Resolve them to absolute paths under the runtime output dir so every
// tegg loader consumer (ModuleConfigUtil, EggAppLoader, LoaderFactory.loadApp
// matching) sees the same absolute-path contract as a non-bundle run. The bundler
// copies each module's package.json under __outputDir, so these resolve correctly.
const __teggExt: any = (MANIFEST_DATA as any).extensions?.tegg;
if (__teggExt) {
  const __toAbs = (p: unknown) =>
    typeof p === 'string' ? (path.isAbsolute(p) ? p : path.resolve(__outputDir, p)) : p;
  if (Array.isArray(__teggExt.moduleReferences)) {
    for (const __ref of __teggExt.moduleReferences) {
      if (__ref) __ref.path = __toAbs(__ref.path);
    }
  }
  if (Array.isArray(__teggExt.moduleDescriptors)) {
    for (const __desc of __teggExt.moduleDescriptors) {
      if (__desc) __desc.unitPath = __toAbs(__desc.unitPath);
    }
  }
}

const __bundleManifestStore = ManifestStore.fromBundle(MANIFEST_DATA as any, __outputDir);
const __loaderFS = new ManifestLoaderFS(__bundleManifestStore);
ManifestStore.setBundleStore(__bundleManifestStore);
globalThis.__EGG_BUNDLE_MODULE_LOADER__ = (filepath) => {
  return __getBundleMap(filepath);
};

const __startOptions = { baseDir: __outputDir, framework: __framework, mode: 'single' as const, loaderFS: __loaderFS };
// Resolve the listen port. Treat an explicit numeric port of 0 (bind a random
// free port) as a real value, so only an unset PORT / config falls through to
// the default — a plain \`||\` chain would wrongly map 0 to 7001.
const __resolvePort = (app: any) => {
  const envPort = process.env.PORT;
  if (envPort !== undefined && envPort !== '') return envPort;
  return app.config.cluster?.listen?.port ?? 7001;
};

if (process.env.EGG_BUNDLE_SNAPSHOT === 'build') {
  // ── snapshot build mode ─────────────────────────────────────────────────
  // Runs under \`node --snapshot-blob <blob> --build-snapshot worker.js\`.
  // Load all metadata with snapshot:true (the lifecycle stops at configWillLoad,
  // no servers/timers/connections), run the snapshotWillSerialize hooks to release
  // non-serializable resources, then register the deserialize main function that
  // V8 invokes when restoring from the blob.
  //
  // Install the egg loader module importer for the BUILD phase too: the loader
  // loads config/app files, and under --build-snapshot Node dynamic import() is
  // unavailable, so route through the bundle map / require() instead. Do NOT set
  // __RUNTIME_REQUIRE here — that would make externals load for real and defeat
  // the lazy snapshot stubs; __EGG_MODULE_IMPORTER__ only feeds app/config files.
  {
    // getBuiltinModule needs Node >= 22.3; fall back to an eval'd require for
    // 22.0–22.2 (same opaque-specifier trick the restore branch uses below).
    const { createRequire: __cr } =
      typeof process.getBuiltinModule === 'function'
        ? process.getBuiltinModule('node:module')
        : (0, eval)('require')('node:module');
    const __buildReq = __cr(__outputDir + '/');
    globalThis.__EGG_MODULE_IMPORTER__ = async (fp: string) => {
      const bundled = __getBundleMap(fp);
      if (bundled !== undefined) return bundled;
      // Only skip when fp ITSELF cannot be resolved (a manifest-miss config unit the
      // loader tolerates). Resolving first separates that from a nested MODULE_NOT_FOUND
      // raised while loading a resolved file, which is a genuine missing dependency that
      // must surface rather than be silently swallowed.
      let resolved: string;
      try {
        resolved = __buildReq.resolve(fp);
      } catch {
        return undefined;
      }
      try {
        return __buildReq(resolved);
      } catch (err) {
        // A resolved ESM file cannot be require()'d under --build-snapshot (no ESM
        // loader); skip it. Any other error — including a nested MODULE_NOT_FOUND from
        // a real missing dependency — is genuine and propagates.
        if ((err as { code?: string } | undefined)?.code === 'ERR_INTERNAL_ASSERTION') return undefined;
        throw err;
      }
    };
  }
  startEgg({ ...__startOptions, snapshot: true }).then(async (app) => {
    if (app.agent) {
      await app.agent.triggerSnapshotWillSerialize();
    }
    await app.triggerSnapshotWillSerialize();

    v8.startupSnapshot.setDeserializeMainFunction(() => {
      // ── snapshot restore main ──────────────────────────────────────────
      // V8 runs this callback synchronously right after deserialization, before
      // the Node ESM loader is ready, so all real work is deferred to the next
      // tick via setImmediate.
      //
      // Restoring a V8 snapshot requires Node.js >= 24: Node.js 22 aborts while
      // deserializing a non-trivial egg heap (V8 bug). The supported launcher
      // (egg-scripts start --snapshot-blob) already gates this before spawning,
      // so this is a defense-in-depth guard for a direct \`node --snapshot-blob\`
      // launch that managed to deserialize on an unsupported runtime.
      const __nodeMajor = parseInt(process.versions.node, 10);
      if (__nodeMajor < 24) {
        // eslint-disable-next-line no-console
        console.error('[egg-bundler] V8 snapshot restore requires Node.js >= 24, but this process is ' + process.version + '. Build works on Node.js >= 22; restore must run on Node.js >= 24.');
        process.exit(1);
      }
      setImmediate(() => {
        // A restored snapshot process has no dynamic import() callback
        // (ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING). Route every egg loader import
        // through require() instead — Node 22+ supports synchronous require() of
        // ESM. __EGG_MODULE_IMPORTER__ is the egg loader hook that takes
        // precedence over import(), so the loader never reaches the missing
        // dynamic import() callback.
        //
        // Use process.getBuiltinModule (Node >= 22.3) rather than a static
        // \`require('node:module')\`/\`import\`: a bare require is traced/rewritten by
        // @utoo/pack inside the single-file bundle, and a build-time import binding
        // is frozen into the snapshot — getBuiltinModule fetches a fresh, working
        // builtin at deserialize time without the bundler ever seeing a specifier.
        // Fall back to an eval'd require for Node < 22.3 (the eval keeps the
        // specifier opaque to @utoo/pack, same as the static-require concern above).
        const { createRequire } =
          typeof process.getBuiltinModule === 'function'
            ? process.getBuiltinModule('node:module')
            : (0, eval)('require')('node:module');
        const __req = createRequire(__outputDir + '/');
        globalThis.__RUNTIME_REQUIRE = (id: string) => __req(id);
        globalThis.__EGG_MODULE_IMPORTER__ = async (fp: string) => __req(fp);

        (async () => {
          if (app.agent) {
            await app.agent.triggerSnapshotDidDeserialize();
          }
          await app.triggerSnapshotDidDeserialize();
          const port = __resolvePort(app);
          app.listen(port, () => {
            // eslint-disable-next-line no-console
            console.log('[egg-bundler] server listening on port %s (restored from snapshot)', port);
            // When launched by \`egg-scripts start --snapshot-blob\` (daemon mode), the
            // parent waits for an egg-ready IPC message before backgrounding. There is
            // no egg-cluster master here, so the snapshot process reports readiness
            // itself over the IPC channel when one is present.
            if (process.connected && typeof process.send === 'function') {
              process.send({ action: 'egg-ready', data: { address: String(port) } });
            }
          });
        })().catch((err) => {
          // eslint-disable-next-line no-console
          console.error('[egg-bundler] failed to restore snapshot:', err);
          process.exit(1);
        });
      });
    });
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[egg-bundler] failed to build snapshot:', err);
    process.exit(1);
  });
} else {
  // ── normal mode ─────────────────────────────────────────────────────────
  startEgg(__startOptions).then((app) => {
    const port = __resolvePort(app);
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log('[egg-bundler] server listening on port %s', port);
    });
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[egg-bundler] failed to start bundled app:', err);
    process.exit(1);
  });
}
`;
  }

  #toImportSpecifier(absPath: string): string {
    // Prefer a relative specifier from the entry output dir to keep the
    // bundled paths portable across machines (absolute paths would leak
    // the bundle-time filesystem layout into the generated source).
    const rel = path.relative(this.#outputDir, absPath).replaceAll(path.sep, '/');
    if (path.isAbsolute(rel)) return pathToFileURL(absPath).href;
    if (rel.startsWith('.')) return rel;
    return `./${rel}`;
  }
}
