import path from 'node:path';
import { debuglog } from 'node:util';

import { RealLoaderFS, type LoaderFS } from '@eggjs/loader-fs';
import { type EggProtoImplClass, type Loader, TeggScope } from '@eggjs/tegg-types';

import { LoaderFactory } from '../LoaderFactory.ts';
import { LoaderUtil } from '../LoaderUtil.ts';

const debug = debuglog('egg/tegg/loader/impl/ModuleLoader');
const LOADER_FS_SLOT = Symbol('tegg:loader:moduleLoaderFS');

export interface ModuleLoaderOptions {
  /** File system abstraction used for discovery. */
  loaderFS?: LoaderFS;
}

export class ModuleLoader implements Loader {
  private readonly moduleDir: string;
  private protoClazzList: EggProtoImplClass[];
  private loadPromise?: Promise<EggProtoImplClass[]>;
  private readonly loaderFS: LoaderFS;

  constructor(moduleDir: string, options: ModuleLoaderOptions = {}) {
    this.moduleDir = moduleDir;
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

    const filePattern = LoaderUtil.filePattern();
    const files = this.loaderFS.glob(filePattern, { cwd: this.moduleDir });
    debug('load files: %o, filePattern: %o, moduleDir: %o', files, filePattern, this.moduleDir);
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
    const scopedLoaderFS = TeggScope.resolve(
      LOADER_FS_SLOT,
      () => loaderFS ?? new RealLoaderFS(),
      'ModuleLoader.loaderFS',
    );
    // A host-provided view is authoritative. This also allows a manifest view
    // to replace a RealLoaderFS that an earlier module loader initialized.
    if (loaderFS && loaderFS !== scopedLoaderFS) {
      TeggScope.set(LOADER_FS_SLOT, loaderFS);
    }
    return new ModuleLoader(modulePath, { loaderFS: loaderFS ?? scopedLoaderFS });
  }
}

LoaderFactory.registerLoader('MODULE', ModuleLoader.createModuleLoader);
