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
}
