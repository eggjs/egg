import BuiltinModule from 'node:module';
import { pathToFileURL } from 'node:url';

import { PrototypeUtil } from '@eggjs/core-decorator';
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
    let exports: any;
    try {
      exports = globalThis.__EGG_BUNDLE_MODULE_LOADER__?.(originalFilePath.split('\\').join('/'));
    } catch (e: unknown) {
      throw createLoadError(originalFilePath, e);
    }
    if (exports == null) {
      try {
        exports =
          globalThis.__EGG_BUNDLE_MODULE_LOADER__ === undefined
            ? await importModule(filePath, { importDefaultOnly: false })
            : await importFallback(filePath);
      } catch (e: unknown) {
        throw createLoadError(filePath, e);
      }
    }
    const normalizedExports = normalizeExports(exports);
    const clazzList: EggProtoImplClass[] = [];
    const exportNames = Object.keys(normalizedExports);
    for (const exportName of exportNames) {
      const clazz = normalizedExports[exportName];
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

async function importFallback(filePath: string): Promise<unknown> {
  if (process.platform === 'win32') {
    // convert to file:// url
    // avoid windows path issue: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'd:'
    filePath = pathToFileURL(filePath).toString();
  }
  return await import(filePath);
}

function normalizeExports(exports: unknown): Record<string, unknown> {
  if (exports !== null && (typeof exports === 'object' || typeof exports === 'function')) {
    if (isClass(exports)) {
      return { default: exports };
    }
    return exports as Record<string, unknown>;
  }
  return {};
}
