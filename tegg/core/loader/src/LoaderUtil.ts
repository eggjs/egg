import BuiltinModule from 'node:module';
import { pathToFileURL } from 'node:url';

import { PrototypeUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { isClass } from 'is-type-of';

// Guard against poorly mocked module constructors.
const Module = globalThis.module?.constructor?.length > 1 ? globalThis.module.constructor : BuiltinModule;

type BundleModuleLoader = (filepath: string) => unknown;

type BundleModuleGlobalThis = typeof globalThis & {
  __EGG_BUNDLE_MODULE_LOADER__?: BundleModuleLoader;
};

interface LoaderUtilConfig {
  extraFilePattern?: string[];
}

export class LoaderUtil {
  static config: LoaderUtilConfig = {};
  static setConfig(config: LoaderUtilConfig): void {
    this.config = config;
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

  static async loadFile(filePath: string): Promise<EggProtoImplClass[]> {
    const originalFilePath = filePath;
    let exports: any = (globalThis as BundleModuleGlobalThis).__EGG_BUNDLE_MODULE_LOADER__?.(
      originalFilePath.split('\\').join('/'),
    );
    if (process.platform === 'win32') {
      // convert to file:// url
      // avoid windows path issue: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'd:'
      filePath = pathToFileURL(filePath).toString();
    }
    if (exports === undefined) {
      try {
        exports = await import(filePath);
      } catch (e: any) {
        console.trace('[tegg/loader] loadFile %s error:', filePath);
        console.error(e);
        throw new Error(`[tegg/loader] load ${filePath} failed: ${e.message}`, {
          cause: e,
        });
      }
    }
    const clazzList: EggProtoImplClass[] = [];
    const exportNames = Object.keys(exports);
    for (const exportName of exportNames) {
      const clazz = exports[exportName];
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
