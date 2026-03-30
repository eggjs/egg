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
  protos: ProtoDescriptor[];
}

export interface ModuleDumpOptions {
  dumpDir?: string;
}

export class ModuleDescriptorDumper {
  static stringifyDescriptor(moduleDescriptor: ModuleDescriptor): string {
    return (
      '{' +
      `"name": "${moduleDescriptor.name}",` +
      `"unitPath": "${moduleDescriptor.unitPath}",` +
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
      `"protos": [${moduleDescriptor.protos
        .map((t) => {
          return JSON.stringify(t);
        })
        .join(',')}]` +
      '}'
    );
  }

  static stringifyClazz(clazz: EggProtoImplClass, moduleDescriptor: ModuleDescriptor): string {
    return (
      '{' +
      `"name": "${clazz.name}",` +
      (PrototypeUtil.getFilePath(clazz)
        ? `"filePath": "${path.relative(moduleDescriptor.unitPath, PrototypeUtil.getFilePath(clazz)!)}"`
        : '') +
      '}'
    );
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
    return Array.from(fileSet);
  }

  static async dump(desc: ModuleDescriptor, options?: ModuleDumpOptions): Promise<void> {
    const dumpPath = ModuleDescriptorDumper.dumpPath(desc, options);
    await fs.mkdir(path.dirname(dumpPath), { recursive: true });
    await fs.writeFile(dumpPath, ModuleDescriptorDumper.stringifyDescriptor(desc));
  }
}
