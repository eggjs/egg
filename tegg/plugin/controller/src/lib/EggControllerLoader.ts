import path from 'node:path';

import type { EggProtoImplClass } from '@eggjs/core-decorator';
import { LoaderUtil } from '@eggjs/tegg-loader';
import type { Loader } from '@eggjs/tegg-types';

export class EggControllerLoader implements Loader {
  private readonly controllerDir: string;
  private readonly precomputedFiles?: string[];

  constructor(controllerDir: string, precomputedFiles?: string[]) {
    this.controllerDir = controllerDir;
    this.precomputedFiles = precomputedFiles;
  }

  async load(): Promise<EggProtoImplClass[]> {
    const filePattern = LoaderUtil.filePattern();
    let files: string[];
    if (this.precomputedFiles) {
      files = this.precomputedFiles.map((file) => (path.isAbsolute(file) ? file : path.join(this.controllerDir, file)));
    } else {
      try {
        files = LoaderUtil.globFiles(filePattern, { cwd: this.controllerDir }).map((file) =>
          path.join(this.controllerDir, file),
        );
      } catch {
        files = [];
        // app/controller dir not exists
      }
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
