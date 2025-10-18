import path from 'node:path';

import { globbySync } from 'globby';
import { type EggProtoImplClass } from '@eggjs/core-decorator';

import { type Loader } from '../../src/index.ts';
import { LoaderUtil } from './LoaderUtil.ts';

export class TestLoader implements Loader {
  private readonly moduleDir: string;

  constructor(moduleDir: string) {
    this.moduleDir = moduleDir;
  }

  async load(): Promise<EggProtoImplClass[]> {
    const protoClassList: EggProtoImplClass[] = [];
    const files = globbySync(['**/*.(js|ts)'], { cwd: this.moduleDir });
    for (const file of files) {
      const realPath = path.join(this.moduleDir, file);
      const protoClazz = await LoaderUtil.loadFile(realPath);
      if (!protoClazz) {
        continue;
      }
      protoClassList.push(...protoClazz);
    }
    return protoClassList;
  }
}
