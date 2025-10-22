import BuiltinModule from 'node:module';
import { pathToFileURL } from 'node:url';

import { PrototypeUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { isClass } from 'is-type-of';

// Guard against poorly mocked module constructors.
const Module = globalThis.module?.constructor?.length > 1 ? globalThis.module.constructor : BuiltinModule;

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
    return extensions;
  }

  static get extension(): string {
    return LoaderUtil.supportExtensions().includes('.ts') ? '.ts' : '.js';
  }

  static filePattern(): string[] {
    const extensions = LoaderUtil.supportExtensions();
    const extensionPattern = extensions
      .map(t => t.substring(1))
      // JSON file will not export class
      .filter(t => t !== 'json')
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
    if (process.platform === 'win32') {
      // convert to file:// url
      // avoid windows path issue: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'd:'
      filePath = pathToFileURL(filePath).toString();
    }
    let exports;
    try {
      exports = await import(filePath);
    } catch (e: any) {
      console.trace('[tegg/loader] loadFile %s error:', filePath);
      console.error(e);
      throw new Error(`[tegg/loader] load ${filePath} failed: ${e.message}`, {
        cause: e,
      });
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
      clazzList.push(clazz);
    }
    return clazzList;
  }
}
