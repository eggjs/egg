import { promises as fs } from 'node:fs';
import path from 'node:path';
import { debuglog } from 'node:util';

import type { BundlerConfig, BundleResult } from '../index.ts';
import { EntryGenerator } from './EntryGenerator.ts';
import { ExternalsResolver } from './ExternalsResolver.ts';
import { ManifestLoader } from './ManifestLoader.ts';
import { PackRunner } from './PackRunner.ts';

const debug = debuglog('egg/bundler/bundler');

const BUNDLE_MANIFEST_VERSION = 1;
const BUNDLE_MANIFEST_FILENAME = 'bundle-manifest.json';

interface BundleManifest {
  readonly version: number;
  readonly generatedAt: string;
  readonly mode: 'production' | 'development';
  readonly baseDir: string;
  readonly framework: string;
  readonly entries: readonly { readonly name: string; readonly source: string }[];
  readonly externals: readonly string[];
  readonly chunks: readonly string[];
}

function wrapStep<T>(step: string, fn: () => Promise<T>): Promise<T> {
  return fn().catch((err: unknown) => {
    const cause = err instanceof Error ? err : new Error(String(err));
    const wrapped = new Error(`[@eggjs/egg-bundler] ${step} failed: ${cause.message}`, { cause });
    throw wrapped;
  });
}

export class Bundler {
  readonly #config: BundlerConfig;

  constructor(config: BundlerConfig) {
    this.#config = config;
  }

  async run(): Promise<BundleResult> {
    const {
      baseDir,
      outputDir: rawOutputDir,
      manifestPath,
      framework = 'egg',
      mode = 'production',
      externals,
      pack,
    } = this.#config;

    const absBaseDir = path.resolve(baseDir);
    const absOutputDir = path.resolve(absBaseDir, rawOutputDir);
    debug('bundle start: baseDir=%s outputDir=%s framework=%s mode=%s', absBaseDir, absOutputDir, framework, mode);

    const manifestLoader = new ManifestLoader({
      baseDir: absBaseDir,
      manifestPath,
      framework,
    });
    await wrapStep('manifest load', () => manifestLoader.load());

    const externalsResolver = new ExternalsResolver({
      baseDir: absBaseDir,
      force: externals?.force,
      inline: externals?.inline,
    });
    const externalsMap = await wrapStep('externals resolve', () => externalsResolver.resolve());
    debug('externals resolved: %d packages', Object.keys(externalsMap).length);

    const entryGen = new EntryGenerator({
      baseDir: absBaseDir,
      manifestLoader,
      framework,
      externals: new Set(Object.keys(externalsMap)),
    });
    const entries = await wrapStep('entry generation', () => entryGen.generate());
    debug('generated worker entry: %s', entries.workerEntry);

    const packRunner = new PackRunner({
      entries: [{ name: 'worker', filepath: entries.workerEntry }],
      outputDir: absOutputDir,
      externals: externalsMap,
      projectPath: absBaseDir,
      rootPath: pack?.rootPath,
      mode,
      buildFunc: pack?.buildFunc,
    });
    const packResult = await wrapStep('pack build', () => packRunner.run());
    debug('pack produced %d files', packResult.files.length);

    // turbopack wraps `import.meta` in a throwing getter for bundled ESM
    // chunks.  Patch the output so `createRequire(import.meta.url)` and
    // other `import.meta.url` usages work at runtime.
    const patchCount = await wrapStep('patch import.meta.url', () => this.#patchImportMetaUrl(absOutputDir));
    debug('patched %d import.meta.url occurrences', patchCount);

    // Merge project name into output package.json so the framework's
    // getAppname() finds it (it reads baseDir/package.json).
    const outputPkgPath = path.join(absOutputDir, 'package.json');
    await wrapStep('patch output package.json', async () => {
      const srcPkg = JSON.parse(await fs.readFile(path.join(absBaseDir, 'package.json'), 'utf8')) as {
        name?: string;
      };
      const outPkg = JSON.parse(await fs.readFile(outputPkgPath, 'utf8')) as Record<string, unknown>;
      if (srcPkg.name) outPkg.name = srcPkg.name;
      await fs.writeFile(outputPkgPath, JSON.stringify(outPkg, null, 2));
    });

    const manifestPathAbs = path.join(absOutputDir, BUNDLE_MANIFEST_FILENAME);
    const bundleManifest: BundleManifest = {
      version: BUNDLE_MANIFEST_VERSION,
      generatedAt: new Date().toISOString(),
      mode,
      baseDir: absBaseDir,
      framework,
      entries: [{ name: 'worker', source: entries.workerEntry }],
      externals: Object.keys(externalsMap).sort(),
      chunks: [...packResult.files].sort(),
    };
    await wrapStep('write bundle-manifest', () =>
      fs.writeFile(manifestPathAbs, JSON.stringify(bundleManifest, null, 2)),
    );

    // Re-enumerate files so bundle-manifest.json is included in the result.
    const finalRelFiles = new Set<string>(packResult.files);
    finalRelFiles.add(BUNDLE_MANIFEST_FILENAME);
    const files = Array.from(finalRelFiles)
      .map((rel) => path.join(absOutputDir, rel))
      .sort();

    return {
      outputDir: absOutputDir,
      files,
      manifestPath: manifestPathAbs,
    };
  }

  /**
   * Turbopack replaces `import.meta` in bundled ESM chunks with an object
   * that only defines a throwing `url` getter and omits `dirname`/`filename`.
   *
   * We post-process the output .js files in two passes:
   * 1. Replace the throwing `url` IIFE with a working `file://` URL.
   * 2. Inject `dirname` and `filename` getters so code like
   *    `path.join(import.meta.dirname, '../lib/asset.html')` works.
   */
  async #patchImportMetaUrl(outputDir: string): Promise<number> {
    // Pass 1 - fix the throwing url getter.
    const THROWING_IIFE =
      /\(\(\)\s*=>\s*\{\s*throw\s+new\s+Error\(\s*['"]could not convert import\.meta\.url to filepath['"]\s*\)\s*;?\s*\}\)\s*\(\)/g;

    // Pass 2 - add dirname/filename for a url-only import.meta object. Match
    // the Turbopack import.meta binding structurally so formatting changes,
    // let/const declarations, or an already-patched url getter still work.
    const META_URL_ONLY =
      /\b(var|let|const)\s+([A-Za-z_$][\w$]*import\$2e\$meta__[A-Za-z0-9_$]*)\s*=\s*\{\s*get\s+url\s*\(\)\s*\{[\s\S]*?\}\s*\};?/g;

    function buildRuntimeExpressions(relativeName: string): { chunkFilenameExpr: string; urlExpr: string } {
      const chunkFilenameExpr = `process.argv[1].replace(/[^\\\\/]*$/, ${JSON.stringify(relativeName)})`;
      const urlExpr = `(() => { const u = new URL("file:///"); u.pathname = ${chunkFilenameExpr}.replace(/\\\\/g, "/"); return u.href; })()`;
      return { chunkFilenameExpr, urlExpr };
    }

    function buildMetaFull(
      declarationKind: string,
      metaName: string,
      chunkFilenameExpr: string,
      urlExpr: string,
    ): string {
      return `${declarationKind} ${metaName} = {
    get url () {
        return ${urlExpr};
    },
    get dirname () {
        return ${chunkFilenameExpr}.replace(/[\\\\/][^\\\\/]*$/, "");
    },
    get filename () {
        return ${chunkFilenameExpr};
    }
};`;
    }

    let totalPatches = 0;
    const entries = await fs.readdir(outputDir, {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
      const filepath = path.join(entry.parentPath ?? outputDir, entry.name);
      const relativeName = path.relative(outputDir, filepath).split(path.sep).join('/');
      const content = await fs.readFile(filepath, 'utf8');
      const { chunkFilenameExpr, urlExpr } = buildRuntimeExpressions(relativeName);

      // Pass 1
      const urlMatches = content.match(THROWING_IIFE);
      let patched = content.replace(THROWING_IIFE, urlExpr);

      // Pass 2
      let metaMatches = 0;
      patched = patched.replace(META_URL_ONLY, (_match, declarationKind: string, metaName: string) => {
        metaMatches++;
        return buildMetaFull(declarationKind, metaName, chunkFilenameExpr, urlExpr);
      });

      if (!urlMatches && metaMatches === 0) continue;

      await fs.writeFile(filepath, patched);
      totalPatches += (urlMatches?.length ?? 0) + metaMatches;
      debug('patched %d import.meta in %s', (urlMatches?.length ?? 0) + metaMatches, relativeName);
    }
    return totalPatches;
  }
}
