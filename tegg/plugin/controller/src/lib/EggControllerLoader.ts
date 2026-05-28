import path from 'node:path';

import type { EggProtoImplClass } from '@eggjs/core-decorator';
import { LoaderUtil } from '@eggjs/tegg-loader';
import type { Loader } from '@eggjs/tegg-types';

function isMissingDirectoryError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

function resolveControllerFile(controllerDir: string, file: string): string {
  return path.normalize(path.isAbsolute(file) ? file : path.join(controllerDir, file));
}

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
      files = this.precomputedFiles.map((file) => resolveControllerFile(this.controllerDir, file));
    } else {
      try {
        files = LoaderUtil.globFiles(filePattern, { cwd: this.controllerDir }).map((file) =>
          resolveControllerFile(this.controllerDir, file),
        );
      } catch (error) {
        if (!isMissingDirectoryError(error)) {
          throw error;
        }
        files = [];
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
