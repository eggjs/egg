import path from 'node:path';
import { debuglog } from 'node:util';

import { RealLoaderFS, type LoaderFS } from '@eggjs/loader-fs';
import type { EggProtoImplClass, Loader } from '@eggjs/tegg-types';

import { LoaderFactory } from '../LoaderFactory.ts';
import { LoaderUtil } from '../LoaderUtil.ts';

const debug = debuglog('egg/tegg/loader/impl/ModuleLoader');

export interface ModuleLoaderOptions {
  /** Pre-computed file list from manifest (only decorated files) */
  precomputedFiles?: string[];
  /** File system abstraction used for discovery; manifest-backed in bundle mode */
  loaderFS?: LoaderFS;
}

export class ModuleLoader implements Loader {
  private readonly moduleDir: string;
  private protoClazzList: EggProtoImplClass[];
  private loadPromise?: Promise<EggProtoImplClass[]>;
  private readonly precomputedFiles?: string[];
  private readonly loaderFS: LoaderFS;

  constructor(moduleDir: string, options: ModuleLoaderOptions = {}) {
    this.moduleDir = moduleDir;
    this.precomputedFiles = options.precomputedFiles;
    this.loaderFS = options.loaderFS ?? new RealLoaderFS();
  }

  async load(): Promise<EggProtoImplClass[]> {
    // optimize for EggModuleLoader
    if (this.protoClazzList) {
      return this.protoClazzList;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const loadPromise = this.loadOnce();
    this.loadPromise = loadPromise;
    try {
      return await loadPromise;
    } finally {
      if (this.loadPromise === loadPromise) {
        this.loadPromise = undefined;
      }
    }
  }

  private async loadOnce(): Promise<EggProtoImplClass[]> {
    const protoClassList: EggProtoImplClass[] = [];

    let files: string[];
    if (this.precomputedFiles) {
      files = this.precomputedFiles;
      debug('load from manifest, files: %o, moduleDir: %o', files, this.moduleDir);
    } else {
      const filePattern = LoaderUtil.filePattern();
      files = this.loaderFS.glob(filePattern, { cwd: this.moduleDir });
      debug('load files: %o, filePattern: %o, moduleDir: %o', files, filePattern, this.moduleDir);
    }
    for (const file of files) {
      const realPath = path.join(this.moduleDir, file);
      const fileClazzList = await LoaderUtil.loadFile(realPath);
      for (const clazz of fileClazzList) {
        protoClassList.push(clazz);
      }
    }
    this.protoClazzList = Array.from(new Set(protoClassList));
    return this.protoClazzList;
  }

  static createModuleLoader(modulePath: string, loaderFS?: LoaderFS): ModuleLoader {
    // Bundles have no filesystem scan; reuse the decorated files in the manifest.
    return new ModuleLoader(modulePath, { precomputedFiles: bundleModuleFiles(modulePath), loaderFS });
  }
}

/** Return the bundled decorated files for a module path. */
function bundleModuleFiles(modulePath: string): string[] | undefined {
  const manifest = (
    globalThis as {
      __EGG_BUNDLE_MANIFEST__?: { moduleDescriptors?: Array<{ unitPath: string; decoratedFiles: string[] }> };
    }
  ).__EGG_BUNDLE_MANIFEST__;
  if (!manifest?.moduleDescriptors) return undefined;
  const key = modulePath.split('\\').join('/');
  return manifest.moduleDescriptors.find((d) => d.unitPath.split('\\').join('/') === key)?.decoratedFiles;
}

LoaderFactory.registerLoader('MODULE', ModuleLoader.createModuleLoader);
