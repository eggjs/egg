import path from 'node:path';
import { debuglog } from 'node:util';
import { globby } from 'globby';
import type { EggProtoImplClass, Loader } from '@eggjs/tegg-types';
import { LoaderUtil } from '../LoaderUtil.js';
import { LoaderFactory } from '../LoaderFactory.js';

const debug = debuglog('@eggjs/tegg-loader/impl/ModuleLoader');

export class ModuleLoader implements Loader {
  private readonly moduleDir: string;
  private protoClazzList: EggProtoImplClass[];

  constructor(moduleDir: string) {
    this.moduleDir = moduleDir;
  }

  async load(): Promise<EggProtoImplClass[]> {
    // optimize for EggModuleLoader
    if (this.protoClazzList) {
      return this.protoClazzList;
    }
    const protoClassList: EggProtoImplClass[] = [];
    const filePattern = LoaderUtil.filePattern();

    const files = await globby(filePattern, { cwd: this.moduleDir });
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

  static createModuleLoader(path: string): ModuleLoader {
    return new ModuleLoader(path);
  }
}

LoaderFactory.registerLoader('MODULE', ModuleLoader.createModuleLoader);
