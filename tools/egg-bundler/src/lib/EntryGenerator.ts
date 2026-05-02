import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { debuglog } from 'node:util';

import type { StartupManifest } from '@eggjs/core';

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
    const frameworkSpec = JSON.stringify(this.#toFrameworkImportSpecifier());

    const externalBlock =
      externalSpecs.length > 0
        ? `
// External-package files: loaded at runtime via require(), not bundled.
// Uses createRequire + dynamic specifiers so @utoo/pack cannot trace them.
import { createRequire as __createRequire } from 'node:module';
const __rtReq = __createRequire(path.join(__baseDir, 'package.json'));
const __EXTERNAL_SPECS: Array<[string, string]> = ${JSON.stringify(externalSpecs)};
for (const [key, spec] of __EXTERNAL_SPECS) {
  __BUNDLE_MAP_REL[key] = __rtReq(spec);
}
`
        : '';

    return `// ⚠️ auto-generated by @eggjs/egg-bundler — do not edit
/* eslint-disable */
import path from 'node:path';

import { ManifestStore } from '@eggjs/core';
import { startEgg } from ${frameworkSpec};

${importLines.join('\n')}

// Derive the runtime output directory from the entry file being executed.
// Cannot use __dirname because turbopack replaces it with the compile-time
// path of the INPUT file, not the OUTPUT directory.
const __baseDir = path.dirname(path.resolve(process.argv[1] || '.'));

const MANIFEST_DATA = ${manifestJson} as const;

const __BUNDLE_MAP_REL: Record<string, unknown> = {
${mapLines.join('\n')}
};
${externalBlock}
const __BUNDLE_MAP: Record<string, unknown> = {};
for (const [rel, mod] of Object.entries(__BUNDLE_MAP_REL)) {
  const abs = path.resolve(__baseDir, rel).split(path.sep).join('/');
  __BUNDLE_MAP[abs] = mod;
  // Also key by posix join so callers that already hand us posix paths hit.
  __BUNDLE_MAP[rel] = mod;
}

const __bundleGlobalThis = globalThis as typeof globalThis & {
  __EGG_BUNDLE_MODULE_LOADER__?: (filepath: string) => unknown;
};
ManifestStore.setBundleStore(ManifestStore.fromBundle(MANIFEST_DATA as any, __baseDir));
__bundleGlobalThis.__EGG_BUNDLE_MODULE_LOADER__ = (filepath) => {
  const key = filepath.split(path.sep).join('/');
  return __BUNDLE_MAP[key];
};

startEgg({ baseDir: __baseDir, mode: 'single' }).then((app) => {
  const port = process.env.PORT || app.config.cluster?.listen?.port || 7001;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log('[egg-bundler] server listening on port %s', port);
  });
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[egg-bundler] failed to start bundled app:', err);
  process.exit(1);
});
`;
  }

  #toFrameworkImportSpecifier(): string {
    if (!path.isAbsolute(this.#framework)) return this.#framework;
    const packageName = this.#packageNameFromDir(this.#framework);
    return packageName ?? this.#toImportSpecifier(this.#framework);
  }

  #packageNameFromDir(dir: string): string | undefined {
    try {
      const req = createRequire(path.join(dir, 'package.json'));
      const pkg = req(path.join(dir, 'package.json')) as { name?: unknown };
      return typeof pkg.name === 'string' && pkg.name ? pkg.name : undefined;
    } catch {
      return undefined;
    }
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
