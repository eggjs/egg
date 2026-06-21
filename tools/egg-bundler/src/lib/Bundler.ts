import { promises as fs } from 'node:fs';
import path from 'node:path';
import { debuglog } from 'node:util';

import { load as yamlLoad } from 'js-yaml';

import type { BundlerConfig, BundleResult } from '../index.ts';
import { EntryGenerator } from './EntryGenerator.ts';
import { ExternalsResolver } from './ExternalsResolver.ts';
import { assertFrameworkPackageSpecifier } from './frameworkSpecifier.ts';
import { ManifestLoader } from './ManifestLoader.ts';
import { PackRunner } from './PackRunner.ts';

const debug = debuglog('egg/bundler/bundler');

const BUNDLE_MANIFEST_VERSION = 1;
const BUNDLE_MANIFEST_FILENAME = 'bundle-manifest.json';
const IMPORT_META_FALLBACK_FILENAME_EXPR = [
  '(() => {',
  'const entryArg = typeof process !== "undefined" && process.argv && process.argv[1] ? process.argv[1] : "worker.js";',
  'if (/^(?:[A-Za-z]:[\\\\/]|\\\\\\\\|\\/)/.test(entryArg)) return entryArg;',
  'const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : ".";',
  'const sep = cwd.includes("\\\\") ? "\\\\" : "/";',
  'const raw = cwd + sep + entryArg;',
  'const slash = raw.replace(/\\\\/g, "/");',
  'const root = /^[A-Za-z]:\\//.test(slash) ? slash.slice(0, 2) : slash.startsWith("//") ? "//" : slash.startsWith("/") ? "/" : "";',
  'const body = root && root !== "/" ? slash.slice(root.length + (root === "//" ? 0 : 1)) : slash;',
  'const parts = [];',
  'for (const part of body.split("/")) { if (!part || part === ".") continue; if (part === "..") parts.pop(); else parts.push(part); }',
  'return root === "/" ? "/" + parts.join("/") : root === "//" ? (sep === "\\\\" ? "\\\\\\\\" : "//") + parts.join(sep) : root ? root + sep + parts.join(sep) : parts.join(sep);',
  '})()',
].join(' ');
const IMPORT_META_FILENAME_EXPR = `(typeof __filename === "string" ? __filename : ${IMPORT_META_FALLBACK_FILENAME_EXPR})`;
const IMPORT_META_URL_EXPR = `(() => { const u = new URL("file:///"); u.pathname = ${IMPORT_META_FILENAME_EXPR}.replace(/\\\\/g, "/"); return u.href; })()`;
const THROWING_IMPORT_META_URL =
  /\(\(\)\s*=>\s*\{\s*throw\s+new\s+Error\(\s*['"][^'"]*import\.meta\.url[^'"]*['"]\s*\)\s*;?\s*\}\)\s*\(\)/g;
const TURBOPACK_IMPORT_META_OBJECT =
  /\b(var|let|const)\s+([A-Za-z_$][\w$]*import\$2e\$meta__[A-Za-z0-9_$]*)\s*=\s*\{\s*get\s+url\s*\(\)\s*\{[\s\S]*?\}\s*\};?/g;
const LINE_SOURCE_MAP_URL = /(?:\r?\n)?\/\/# sourceMappingURL=([^\r\n]*)\s*$/;
const BLOCK_SOURCE_MAP_URL = /(?:\r?\n)?\/\*# sourceMappingURL=([\s\S]*?)\*\/\s*$/;
const UNSAFE_ALIAS_SPECIFIERS = new Set(['__proto__', 'constructor', 'prototype']);
const DEFAULT_RUNTIME_ASSET_ROOTS = ['app'];
const DEFAULT_FORCE_COPY_RUNTIME_ASSET_DIRS = ['app/public', 'app/assets', 'app/static'];
const BUNDLED_SOURCE_EXTENSIONS = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);

type JsonRecord = Record<string, unknown>;

interface ModuleBundleConfig {
  readonly pack?: BundlerConfig['pack'];
  readonly runtimeAssets?: BundlerConfig['runtimeAssets'];
}

interface ResolvedRuntimeAssetsConfig {
  readonly roots: readonly string[];
  readonly forceCopyDirs: readonly string[];
}

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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function normalizePackAliasTarget(baseDir: string, target: string): string {
  return target.startsWith('.') ? path.resolve(baseDir, target) : target;
}

function validateModulePackAliasSpecifier(filepath: string, specifier: string): void {
  if (!specifier) {
    throw new Error(`Invalid bundle config in ${filepath}: bundle.pack.resolve.alias contains an empty specifier.`);
  }
  if (UNSAFE_ALIAS_SPECIFIERS.has(specifier)) {
    throw new Error(`Invalid bundle config in ${filepath}: bundle.pack.resolve.alias.${specifier} is not allowed.`);
  }
}

function normalizeRuntimeAssetDir(filepath: string, configPath: string, dir: string): string {
  let rel: string;
  try {
    rel = sanitizeBundleOutputRelativePath(dir);
  } catch (err) {
    throw new Error(
      `Invalid bundle config in ${filepath}: ${configPath} contains unsafe path ${JSON.stringify(dir)}.`,
      { cause: err },
    );
  }
  if (rel.endsWith('/')) {
    throw new Error(`Invalid bundle config in ${filepath}: ${configPath} contains ${dir}.`);
  }
  return rel;
}

function normalizeRuntimeAssetRoot(filepath: string, root: string): string {
  return normalizeRuntimeAssetDir(filepath, 'bundle.runtimeAssets.roots', root);
}

function normalizeRuntimeAssetRoots(filepath: string, roots: readonly string[]): readonly string[] {
  return Array.from(new Set(roots.map((root) => normalizeRuntimeAssetRoot(filepath, root))));
}

function normalizeRuntimeAssetForceCopyDir(filepath: string, dir: string): string {
  return normalizeRuntimeAssetDir(filepath, 'bundle.runtimeAssets.forceCopyDirs', dir);
}

function normalizeRuntimeAssetForceCopyDirs(filepath: string, dirs: readonly string[]): readonly string[] {
  return Array.from(new Set(dirs.map((dir) => normalizeRuntimeAssetForceCopyDir(filepath, dir))));
}

function parseModuleBundleConfig(
  filepath: string,
  baseDir: string,
  rawConfig: unknown,
): ModuleBundleConfig | undefined {
  if (rawConfig == null) return undefined;
  if (!isRecord(rawConfig)) {
    throw new Error(`Invalid bundle config in ${filepath}: module.yml must contain an object.`);
  }

  const bundleConfig = rawConfig.bundle;
  if (bundleConfig == null) return undefined;
  if (!isRecord(bundleConfig)) {
    throw new Error(`Invalid bundle config in ${filepath}: bundle must be an object.`);
  }

  return {
    pack: parseModuleBundlePackConfig(filepath, baseDir, bundleConfig),
    runtimeAssets: parseModuleBundleRuntimeAssetsConfig(filepath, bundleConfig),
  };
}

function parseModuleBundlePackConfig(
  filepath: string,
  baseDir: string,
  bundleConfig: JsonRecord,
): BundlerConfig['pack'] {
  const packConfig = bundleConfig.pack;
  if (packConfig == null) return undefined;
  if (!isRecord(packConfig)) {
    throw new Error(`Invalid bundle config in ${filepath}: bundle.pack must be an object.`);
  }

  const resolveConfig = packConfig.resolve;
  if (resolveConfig == null) return undefined;
  if (!isRecord(resolveConfig)) {
    throw new Error(`Invalid bundle config in ${filepath}: bundle.pack.resolve must be an object.`);
  }

  const aliasConfig = resolveConfig.alias;
  if (aliasConfig == null) return undefined;
  if (!isRecord(aliasConfig)) {
    throw new Error(`Invalid bundle config in ${filepath}: bundle.pack.resolve.alias must be an object.`);
  }

  const alias: Record<string, string> = {};
  for (const [specifier, target] of Object.entries(aliasConfig)) {
    validateModulePackAliasSpecifier(filepath, specifier);
    if (typeof target !== 'string' || target.length === 0) {
      throw new Error(
        `Invalid bundle config in ${filepath}: bundle.pack.resolve.alias.${specifier} must be a non-empty string.`,
      );
    }
    alias[specifier] = normalizePackAliasTarget(baseDir, target);
  }

  return Object.keys(alias).length > 0 ? { resolve: { alias } } : undefined;
}

function parseModuleBundleRuntimeAssetsConfig(
  filepath: string,
  bundleConfig: JsonRecord,
): BundlerConfig['runtimeAssets'] {
  const runtimeAssetsConfig = bundleConfig.runtimeAssets;
  if (runtimeAssetsConfig == null) return undefined;
  if (!isRecord(runtimeAssetsConfig)) {
    throw new Error(`Invalid bundle config in ${filepath}: bundle.runtimeAssets must be an object.`);
  }

  const rootsConfig = runtimeAssetsConfig.roots;
  let roots: readonly string[] | undefined;
  if (rootsConfig != null) {
    if (!Array.isArray(rootsConfig)) {
      throw new Error(`Invalid bundle config in ${filepath}: bundle.runtimeAssets.roots must be an array.`);
    }
    roots = rootsConfig.map((root, index) => {
      if (typeof root !== 'string' || root.length === 0) {
        throw new Error(
          `Invalid bundle config in ${filepath}: bundle.runtimeAssets.roots[${index}] must be a non-empty string.`,
        );
      }
      return normalizeRuntimeAssetRoot(filepath, root);
    });
  }

  const forceCopyDirsConfig = runtimeAssetsConfig.forceCopyDirs;
  let forceCopyDirs: readonly string[] | undefined;
  if (forceCopyDirsConfig != null) {
    if (!Array.isArray(forceCopyDirsConfig)) {
      throw new Error(`Invalid bundle config in ${filepath}: bundle.runtimeAssets.forceCopyDirs must be an array.`);
    }
    forceCopyDirs = forceCopyDirsConfig.map((dir, index) => {
      if (typeof dir !== 'string' || dir.length === 0) {
        throw new Error(
          `Invalid bundle config in ${filepath}: bundle.runtimeAssets.forceCopyDirs[${index}] must be a non-empty string.`,
        );
      }
      return normalizeRuntimeAssetForceCopyDir(filepath, dir);
    });
  }

  if (roots == null && forceCopyDirs == null) return undefined;

  return {
    ...(roots == null ? {} : { roots: normalizeRuntimeAssetRoots(filepath, roots) }),
    ...(forceCopyDirs == null ? {} : { forceCopyDirs: normalizeRuntimeAssetForceCopyDirs(filepath, forceCopyDirs) }),
  };
}

async function loadModuleBundleConfig(baseDir: string): Promise<ModuleBundleConfig | undefined> {
  const filepath = path.join(baseDir, 'module.yml');
  let content: string;
  try {
    content = await fs.readFile(filepath, 'utf8');
  } catch (err) {
    if (isRecord(err) && err.code === 'ENOENT') return undefined;
    throw new Error(`Unable to read ${filepath}: ${getErrorMessage(err)}`, { cause: err });
  }

  if (content.trim().length === 0) return undefined;

  let rawConfig: unknown;
  try {
    rawConfig = yamlLoad(content);
  } catch (err) {
    throw new Error(`Unable to parse ${filepath}: ${getErrorMessage(err)}`, { cause: err });
  }

  return parseModuleBundleConfig(filepath, baseDir, rawConfig);
}

function mergePackConfig(
  modulePack: BundlerConfig['pack'],
  explicitPack: BundlerConfig['pack'],
): BundlerConfig['pack'] {
  const alias = {
    ...modulePack?.resolve?.alias,
    ...explicitPack?.resolve?.alias,
  };
  const hasAlias = Object.keys(alias).length > 0;
  if (!explicitPack && !hasAlias) return undefined;
  const resolve = {
    ...explicitPack?.resolve,
    ...(hasAlias ? { alias } : {}),
  };

  return {
    ...explicitPack,
    ...(Object.keys(resolve).length > 0 ? { resolve } : {}),
  };
}

function mergeRuntimeAssetsConfig(
  moduleRuntimeAssets: BundlerConfig['runtimeAssets'],
  explicitRuntimeAssets: BundlerConfig['runtimeAssets'],
): ResolvedRuntimeAssetsConfig {
  const roots = explicitRuntimeAssets?.roots ?? moduleRuntimeAssets?.roots ?? DEFAULT_RUNTIME_ASSET_ROOTS;
  const forceCopyDirs =
    explicitRuntimeAssets?.forceCopyDirs ?? moduleRuntimeAssets?.forceCopyDirs ?? DEFAULT_FORCE_COPY_RUNTIME_ASSET_DIRS;

  return {
    roots: normalizeRuntimeAssetRoots('BundlerConfig', roots),
    forceCopyDirs: normalizeRuntimeAssetForceCopyDirs('BundlerConfig', forceCopyDirs),
  };
}

export function sanitizeBundleOutputRelativePath(relativeName: string): string {
  const normalized = relativeName.replace(/\\/g, '/');
  const segments = normalized.split('/');
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    segments.some((segment) => !segment || segment === '.' || segment === '..') ||
    normalized.includes('\0') ||
    /[\r\n\u2028\u2029]/u.test(normalized)
  ) {
    throw new Error(`Unsafe bundle output path: ${relativeName}`);
  }
  return normalized;
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
      runtimeAssets,
    } = this.#config;

    const absBaseDir = path.resolve(baseDir);
    const absOutputDir = path.resolve(absBaseDir, rawOutputDir);
    assertFrameworkPackageSpecifier(framework);
    debug('bundle start: baseDir=%s outputDir=%s framework=%s mode=%s', absBaseDir, absOutputDir, framework, mode);
    const moduleConfig = await wrapStep('module.yml bundle config load', () => loadModuleBundleConfig(absBaseDir));
    const mergedPack = mergePackConfig(moduleConfig?.pack, pack);
    const mergedRuntimeAssets = mergeRuntimeAssetsConfig(moduleConfig?.runtimeAssets, runtimeAssets);

    const manifestLoader = new ManifestLoader({
      baseDir: absBaseDir,
      manifestPath,
      framework,
      autoGenerate: true,
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
      // Use the generated entry dir as the project root so PackRunner's
      // compiler tsconfig (useDefineForClassFields:false, decorator metadata)
      // is the one @utoo/pack resolves — Turbopack reads tsconfig from the
      // project dir, not the output dir or the app's own tsconfig. rootPath
      // stays at the app baseDir (or a caller-supplied monorepo root) so the
      // app sources and node_modules above the entry dir still resolve.
      projectPath: entries.entryDir,
      // Resolve a caller-supplied rootPath against absBaseDir so a relative value
      // does not depend on cwd; default to the app baseDir.
      rootPath: mergedPack?.rootPath ? path.resolve(absBaseDir, mergedPack.rootPath) : absBaseDir,
      mode,
      buildFunc: mergedPack?.buildFunc,
      resolve: mergedPack?.resolve,
    });
    const packResult = await wrapStep('pack build', () => packRunner.run());
    debug('pack produced %d files', packResult.files.length);

    const patchResult = await wrapStep('patch import.meta output', () =>
      this.#patchImportMetaOutput(absOutputDir, packResult.files),
    );
    debug(
      'patched %d import.meta output occurrences and removed %d sourcemaps',
      patchResult.patchCount,
      patchResult.deletedMapCount,
    );

    const copiedRuntimeAssets = await wrapStep('runtime asset copy', () =>
      this.#copyRuntimeAssets(absBaseDir, absOutputDir, manifestLoader, mergedRuntimeAssets),
    );
    debug('copied %d runtime assets', copiedRuntimeAssets.length);

    const manifestPathAbs = path.join(absOutputDir, BUNDLE_MANIFEST_FILENAME);
    const bundleManifest: BundleManifest = {
      version: BUNDLE_MANIFEST_VERSION,
      generatedAt: new Date().toISOString(),
      mode,
      baseDir: absBaseDir,
      framework,
      entries: [{ name: 'worker', source: entries.workerEntry }],
      externals: Object.keys(externalsMap).sort((a, b) => a.localeCompare(b)),
      chunks: Array.from(new Set([...patchResult.outputFiles, ...copiedRuntimeAssets])).sort((a, b) =>
        a.localeCompare(b),
      ),
    };
    await wrapStep('write bundle-manifest', () =>
      fs.writeFile(manifestPathAbs, JSON.stringify(bundleManifest, null, 2)),
    );

    // Re-enumerate files so bundle-manifest.json is included in the result.
    const finalRelFiles = new Set<string>(bundleManifest.chunks);
    finalRelFiles.add(BUNDLE_MANIFEST_FILENAME);
    const files = Array.from(finalRelFiles)
      .map((rel) => path.join(absOutputDir, rel))
      .sort((a, b) => a.localeCompare(b));

    return {
      outputDir: absOutputDir,
      files,
      manifestPath: manifestPathAbs,
    };
  }

  async #copyRuntimeAssets(
    baseDir: string,
    outputDir: string,
    manifestLoader: ManifestLoader,
    runtimeAssetsConfig: ResolvedRuntimeAssetsConfig,
  ): Promise<readonly string[]> {
    const copied = new Set<string>();
    const bundledSourceFiles = new Set<string>();
    for (const filepath of manifestLoader.getAllDiscoveredFiles()) {
      bundledSourceFiles.add(filepath);
    }
    for (const filepath of manifestLoader.getTeggDecoratedFiles()) {
      bundledSourceFiles.add(filepath);
    }
    for (const value of Object.values(manifestLoader.manifest.resolveCache)) {
      if (typeof value === 'string') bundledSourceFiles.add(path.resolve(baseDir, value));
    }

    for (const root of runtimeAssetsConfig.roots) {
      const absRoot = path.join(baseDir, root);
      await this.#copyRuntimeAssetsUnderRoot(
        baseDir,
        outputDir,
        absRoot,
        bundledSourceFiles,
        copied,
        runtimeAssetsConfig,
      );
    }

    return Array.from(copied).sort((a, b) => a.localeCompare(b));
  }

  async #copyRuntimeAssetsUnderRoot(
    baseDir: string,
    outputDir: string,
    dir: string,
    bundledSourceFiles: ReadonlySet<string>,
    copied: Set<string>,
    runtimeAssetsConfig: ResolvedRuntimeAssetsConfig,
  ): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw err;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const filepath = path.join(dir, entry.name);
      if (this.#isInsideDir(outputDir, filepath)) continue;
      // Dirent flags from withFileTypes are not followed here; symlinked app
      // assets are skipped so a link cannot escape baseDir/app during copying.
      if (entry.isSymbolicLink()) continue;
      if (this.#shouldSkipRuntimeAssetEntry(entry.name)) continue;

      if (entry.isDirectory()) {
        await this.#copyRuntimeAssetsUnderRoot(
          baseDir,
          outputDir,
          filepath,
          bundledSourceFiles,
          copied,
          runtimeAssetsConfig,
        );
        continue;
      }

      if (!entry.isFile()) continue;
      const rel = this.#sanitizeOutputRelativePath(path.relative(baseDir, filepath));
      if (bundledSourceFiles.has(filepath) || !this.#shouldCopyRuntimeAsset(rel, runtimeAssetsConfig)) continue;

      const target = path.join(outputDir, rel);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(filepath, target);
      copied.add(rel);
    }
  }

  #shouldSkipRuntimeAssetEntry(name: string): boolean {
    return name === 'node_modules' || name.startsWith('.');
  }

  #shouldCopyRuntimeAsset(rel: string, runtimeAssetsConfig: ResolvedRuntimeAssetsConfig): boolean {
    if (runtimeAssetsConfig.forceCopyDirs.some((dir) => rel === dir || rel.startsWith(`${dir}/`))) return true;
    return !BUNDLED_SOURCE_EXTENSIONS.has(path.posix.extname(rel));
  }

  async #patchImportMetaOutput(
    outputDir: string,
    inputFiles: readonly string[],
  ): Promise<{ patchCount: number; deletedMapCount: number; outputFiles: readonly string[] }> {
    let patchCount = 0;
    let deletedMapCount = 0;
    const files = inputFiles.map((rel) => this.#sanitizeOutputRelativePath(rel)).sort((a, b) => a.localeCompare(b));
    const deletedFiles = new Set<string>();

    for (const rel of files) {
      if (!rel.endsWith('.js')) continue;

      const filepath = path.join(outputDir, rel);
      const content = await fs.readFile(filepath, 'utf8');

      let metaMatches = 0;
      let patched = content.replace(
        TURBOPACK_IMPORT_META_OBJECT,
        (_match, declarationKind: string, metaName: string) => {
          metaMatches++;
          return this.#renderImportMetaObject(declarationKind, metaName);
        },
      );

      const urlMatches = patched.match(THROWING_IMPORT_META_URL);
      patched = patched.replace(THROWING_IMPORT_META_URL, IMPORT_META_URL_EXPR);

      const patchesForFile = (urlMatches?.length ?? 0) + metaMatches;
      if (patchesForFile === 0) continue;

      const stripped = this.#stripSourceMappingUrl(patched);
      await fs.writeFile(filepath, stripped);

      patchCount += patchesForFile;
      const staleMaps = await this.#deleteStaleSourceMaps(outputDir, filepath, content);
      deletedMapCount += staleMaps.deletedCount;
      for (const deleted of staleMaps.deletedFiles) deletedFiles.add(deleted);
      debug('patched %d import.meta output occurrences in %s', patchesForFile, rel);
    }

    const outputFiles = files.filter((rel) => !deletedFiles.has(rel));
    return { patchCount, deletedMapCount, outputFiles };
  }

  #renderImportMetaObject(declarationKind: string, metaName: string): string {
    return `${declarationKind} ${metaName} = (() => {
    const filename = ${IMPORT_META_FILENAME_EXPR};
    const dirname = (() => {
        const slashIndex = Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\\\"));
        if (slashIndex > 2 || (slashIndex > 0 && !/^[A-Za-z]:[\\\\/]/.test(filename))) return filename.slice(0, slashIndex);
        if (slashIndex === 2 && /^[A-Za-z]:[\\\\/]/.test(filename)) return filename.slice(0, 3);
        if (slashIndex === 0) return filename[0];
        return ".";
    })();
    const url = (() => { const u = new URL("file:///"); u.pathname = filename.replace(/\\\\/g, "/"); return u.href; })();
    return {
    get url () {
        return url;
    },
    get dirname () {
        return dirname;
    },
    get filename () {
        return filename;
    }
};
})();`;
  }

  #stripSourceMappingUrl(content: string): string {
    return content.replace(LINE_SOURCE_MAP_URL, '').replace(BLOCK_SOURCE_MAP_URL, '');
  }

  async #deleteStaleSourceMaps(
    outputDir: string,
    filepath: string,
    originalContent: string,
  ): Promise<{ deletedCount: number; deletedFiles: readonly string[] }> {
    const mapPaths = new Set<string>([`${filepath}.map`]);
    const sourceMapUrl = this.#extractSourceMappingUrl(originalContent);
    if (sourceMapUrl && !sourceMapUrl.startsWith('data:')) {
      const resolved = path.resolve(path.dirname(filepath), sourceMapUrl);
      if (resolved.endsWith('.map') && this.#isInsideDir(outputDir, resolved)) mapPaths.add(resolved);
    }

    let deletedCount = 0;
    const deletedFiles: string[] = [];
    for (const mapPath of mapPaths) {
      if (!this.#isInsideDir(outputDir, mapPath)) continue;
      try {
        await fs.unlink(mapPath);
        deletedCount++;
        deletedFiles.push(
          this.#sanitizeOutputRelativePath(path.relative(outputDir, mapPath).split(path.sep).join('/')),
        );
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }
    }
    return { deletedCount, deletedFiles };
  }

  #extractSourceMappingUrl(content: string): string | undefined {
    const lineMatch = content.match(LINE_SOURCE_MAP_URL);
    if (lineMatch?.[1]) return lineMatch[1].trim();
    const blockMatch = content.match(BLOCK_SOURCE_MAP_URL);
    if (blockMatch?.[1]) return blockMatch[1].trim();
    return undefined;
  }

  #sanitizeOutputRelativePath(relativeName: string): string {
    return sanitizeBundleOutputRelativePath(relativeName);
  }

  #isInsideDir(dir: string, target: string): boolean {
    const rel = path.relative(dir, target);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  }
}
