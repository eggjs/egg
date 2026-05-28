import path from 'node:path';
import { debuglog } from 'node:util';

import { RealLoaderFS, type LoaderFS } from '@eggjs/loader-fs';
import type { EggProtoImplClass, Loader } from '@eggjs/tegg-types';

import { LoaderFactory } from '../LoaderFactory.ts';
import { LoaderUtil } from '../LoaderUtil.ts';

const debug = debuglog('egg/tegg/loader/impl/ModuleLoader');

export class ModuleLoader implements Loader {
  private readonly moduleDir: string;
  private readonly loaderFS: LoaderFS;
  private protoClazzList: EggProtoImplClass[];
  /** Pre-computed file list from manifest (only decorated files) */
  private readonly precomputedFiles?: string[];

  constructor(moduleDir: string, precomputedFiles?: string[], loaderFS: LoaderFS = new RealLoaderFS()) {
    this.moduleDir = moduleDir;
    this.precomputedFiles = precomputedFiles;
    this.loaderFS = loaderFS;
  }

  async load(): Promise<EggProtoImplClass[]> {
    // optimize for EggModuleLoader
    if (this.protoClazzList) {
      return this.protoClazzList;
    }
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

  static createModuleLoader(path: string, options?: { loaderFS?: LoaderFS }): ModuleLoader {
    return new ModuleLoader(path, undefined, options?.loaderFS);
  }
}

LoaderFactory.registerLoader('MODULE', ModuleLoader.createModuleLoader);
