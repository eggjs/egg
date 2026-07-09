import fs from 'node:fs/promises';
import path from 'node:path';

import { PrototypeUtil } from '@eggjs/core-decorator';
import { type EggProtoImplClass, type ProtoDescriptor } from '@eggjs/tegg-types';

const DUMP_PATH = process.env.MODULE_DUMP_PATH;

export interface ModuleDescriptor {
  name: string;
  unitPath: string;
  optional?: boolean;
  clazzList: EggProtoImplClass[];
  multiInstanceClazzList: EggProtoImplClass[];
  innerObjectClazzList: EggProtoImplClass[];
  protos: ProtoDescriptor[];
}

export interface ModuleDumpOptions {
  dumpDir?: string;
}

export class ModuleDescriptorDumper {
  static stringifyDescriptor(moduleDescriptor: ModuleDescriptor): string {
    return (
      '{' +
      // JSON.stringify the string fields — unitPath/filePath contain
      // backslashes on Windows, raw interpolation produces invalid JSON.
      `"name": ${JSON.stringify(moduleDescriptor.name)},` +
      `"unitPath": ${JSON.stringify(moduleDescriptor.unitPath)},` +
      (typeof moduleDescriptor.optional !== 'undefined' ? `"optional": ${moduleDescriptor.optional},` : '') +
      `"clazzList": [${moduleDescriptor.clazzList
        .map((t) => {
          return ModuleDescriptorDumper.stringifyClazz(t, moduleDescriptor);
        })
        .join(',')}],` +
      `"multiInstanceClazzList": [${moduleDescriptor.multiInstanceClazzList
        .map((t) => {
          return ModuleDescriptorDumper.stringifyClazz(t, moduleDescriptor);
        })
        .join(',')}],` +
      `"innerObjectClazzList": [${moduleDescriptor.innerObjectClazzList
        .map((t) => {
          return ModuleDescriptorDumper.stringifyClazz(t, moduleDescriptor);
        })
        .join(',')}],` +
      `"protos": [${moduleDescriptor.protos
        .map((t) => {
          return JSON.stringify(t);
        })
        .join(',')}]` +
      '}'
    );
  }

  static stringifyClazz(clazz: EggProtoImplClass, moduleDescriptor: ModuleDescriptor): string {
    const filePath = PrototypeUtil.getFilePath(clazz);
    return JSON.stringify({
      name: clazz.name,
      ...(filePath ? { filePath: path.relative(moduleDescriptor.unitPath, filePath) } : {}),
    });
  }

  static dumpPath(desc: ModuleDescriptor, options?: ModuleDumpOptions): string {
    const dumpDir = DUMP_PATH ?? options?.dumpDir ?? desc.unitPath;
    return path.join(dumpDir, '.egg', `${desc.name}_module_desc.json`);
  }

  /**
   * Extract decorated file paths (relative to unitPath) from a ModuleDescriptor.
   * Used for manifest generation to record which files contain egg prototypes.
   */
  static getDecoratedFiles(desc: ModuleDescriptor): string[] {
    const fileSet = new Set<string>();
    const addClazz = (clazz: EggProtoImplClass): void => {
      const filePath = PrototypeUtil.getFilePath(clazz);
      if (filePath) {
        const rel = path.relative(desc.unitPath, filePath).replaceAll(path.sep, '/');
        // Only include files within the module (multiInstanceClazzList is shared)
        if (!rel.startsWith('..')) {
          fileSet.add(rel);
        }
      }
    };
    for (const clazz of desc.clazzList) addClazz(clazz);
    for (const clazz of desc.multiInstanceClazzList) addClazz(clazz);
    // Inner object / lifecycle proto classes are diverted out of clazzList, but
    // their files must still be recorded so bundle mode re-imports them.
    for (const clazz of desc.innerObjectClazzList) addClazz(clazz);
    return Array.from(fileSet);
  }

  static async dump(desc: ModuleDescriptor, options?: ModuleDumpOptions): Promise<void> {
    const dumpPath = ModuleDescriptorDumper.dumpPath(desc, options);
    const dumpDir = path.dirname(dumpPath);
    await fs.mkdir(dumpDir, { recursive: true });
    const tmpDir = await fs.mkdtemp(path.join(dumpDir, '.tmp-'));
    const tmpPath = path.join(tmpDir, path.basename(dumpPath));
    try {
      await fs.writeFile(tmpPath, ModuleDescriptorDumper.stringifyDescriptor(desc));
      await fs.rename(tmpPath, dumpPath);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }
}
