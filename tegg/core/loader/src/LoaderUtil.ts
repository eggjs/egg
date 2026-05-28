import BuiltinModule from 'node:module';

import { PrototypeUtil } from '@eggjs/core-decorator';
import { RealLoaderFS, type LoaderFS, type LoaderFSGlobOptions } from '@eggjs/loader-fs';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import type {} from '@eggjs/typings/global';
import { importModule } from '@eggjs/utils';
import { isClass } from 'is-type-of';

// Guard against poorly mocked module constructors.
const Module = globalThis.module?.constructor?.length > 1 ? globalThis.module.constructor : BuiltinModule;

function createLoadError(filePath: string, e: unknown): Error {
  const message = e instanceof Error ? e.message : String(e);
  return new Error(`[tegg/loader] load ${filePath} failed: ${message}`, {
    cause: e,
  });
}

interface LoaderUtilConfig {
  extraFilePattern?: string[];
  loaderFS?: LoaderFS;
}

class TeggLoaderFS extends RealLoaderFS {
  override async loadFile(filepath: string): Promise<unknown> {
    return await importModule(filepath);
  }
}

export class LoaderUtil {
  static config: LoaderUtilConfig = {};
  static #defaultLoaderFS = new TeggLoaderFS();

  static setConfig(config: LoaderUtilConfig): void {
    this.config = config;
  }

  static get loaderFS(): LoaderFS {
    return this.config.loaderFS ?? this.#defaultLoaderFS;
  }

  static supportExtensions(): string[] {
    const extensions = Object.keys((Module as any)._extensions);
    if (process.env.VITEST === 'true' && !extensions.includes('.ts')) {
      extensions.push('.ts');
    }
    // Respect EGG_TS_ENABLE=false to disable TypeScript file loading
    // (e.g., production deployment with compiled .js files)
    if (process.env.EGG_TS_ENABLE === 'false') {
      return extensions.filter((ext) => ext !== '.ts' && ext !== '.mts' && ext !== '.cts');
    }
    return extensions;
  }

  static get extension(): string {
    return LoaderUtil.supportExtensions().includes('.ts') ? '.ts' : '.js';
  }

  static filePattern(): string[] {
    const extensions = LoaderUtil.supportExtensions();
    const extensionPattern = extensions
      .map((t) => t.substring(1))
      // JSON file will not export class
      .filter((t) => t !== 'json')
      .join('|');

    const filePattern = [
      // load file end with node module allow extensions
      `**/*.(${extensionPattern})`,
      // not load files in .xxx/
      '!**/+(.*)/**',
      // not load node module
      '!**/node_modules',
      // node load type definitions
      '!**/*.d.ts',
      // not load test/coverage files
      '!**/test',
      '!**/coverage',
      // extra file pattern
      ...(this.config.extraFilePattern || []),
    ];

    return filePattern;
  }

  static globFiles(patterns: string | string[], options?: LoaderFSGlobOptions): string[] {
    return this.loaderFS.glob(patterns, options);
  }

  static async loadFile(filePath: string): Promise<EggProtoImplClass[]> {
    const originalFilePath = filePath;
    let exports: unknown;
    try {
      exports = await this.loaderFS.loadFile(originalFilePath);
    } catch (e: unknown) {
      throw createLoadError(originalFilePath, e);
    }

    const clazzList: EggProtoImplClass[] = [];
    const candidates =
      exports && (typeof exports === 'object' || typeof exports === 'function') ? Object.values(exports) : [];

    if (exports && isClass(exports)) {
      candidates.push(exports);
    }

    for (const clazz of candidates) {
      const isEggProto =
        isClass(clazz) && (PrototypeUtil.isEggPrototype(clazz) || PrototypeUtil.isEggMultiInstancePrototype(clazz));
      if (!isEggProto) {
        continue;
      }
      // Correct FILE_PATH after async import, because decorators like @Schedule
      // use StackUtil.getCalleeFromStack() which may return <anonymous> when
      // modules are loaded via async import() (e.g., in vitest environment)
      PrototypeUtil.setFilePath(clazz, originalFilePath);
      clazzList.push(clazz);
    }
    return clazzList;
  }
}
