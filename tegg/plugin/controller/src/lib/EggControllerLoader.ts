import path from 'node:path';

import type { EggProtoImplClass } from '@eggjs/core-decorator';
import { RealLoaderFS, type LoaderFS } from '@eggjs/loader-fs';
import { LoaderUtil } from '@eggjs/tegg-loader';
import type { Loader } from '@eggjs/tegg-types';

interface FileDiscoveryManifest {
  globFiles?: (directory: string, fallback: () => string[]) => string[];
}

export class EggControllerLoader implements Loader {
  private readonly controllerDir: string;
  private readonly loaderFS: LoaderFS;
  private readonly manifest?: FileDiscoveryManifest;

  constructor(controllerDir: string, options?: { loaderFS?: LoaderFS; manifest?: FileDiscoveryManifest }) {
    this.controllerDir = controllerDir;
    this.loaderFS = options?.loaderFS ?? new RealLoaderFS();
    this.manifest = options?.manifest;
  }

  async load(): Promise<EggProtoImplClass[]> {
    const filePattern = LoaderUtil.filePattern();
    let files: string[];
    try {
      const discovered =
        typeof this.manifest?.globFiles === 'function'
          ? this.manifest.globFiles(this.controllerDir, () =>
              this.loaderFS.glob(filePattern, { cwd: this.controllerDir }),
            )
          : this.loaderFS.glob(filePattern, { cwd: this.controllerDir });
      const httpControllers = discovered.map((file) => path.join(this.controllerDir, file));
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
