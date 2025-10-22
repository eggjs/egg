import path from 'node:path';

import globby from 'globby';
import { LoaderUtil } from '@eggjs/tegg-loader';
import type { EggProtoImplClass } from '@eggjs/core-decorator';
import type { Loader } from '@eggjs/tegg-types';

export class EggControllerLoader implements Loader {
  private readonly controllerDir: string;

  constructor(controllerDir: string) {
    this.controllerDir = controllerDir;
  }

  async load(): Promise<EggProtoImplClass[]> {
    const filePattern = LoaderUtil.filePattern();
    let files: string[];
    try {
      const httpControllers = (await globby(filePattern, { cwd: this.controllerDir })).map((file) =>
        path.join(this.controllerDir, file),
      );
      files = httpControllers;
    } catch {
      files = [];
      // app/controller dir not exists
    }
    const protoClassList: EggProtoImplClass[] = [];
    for (const file of files) {
      const fileClazzList = await LoaderUtil.loadFile(file);
      for (const clazz of fileClazzList) {
        protoClassList.push(clazz);
      }
    }
    return protoClassList;
  }
}
