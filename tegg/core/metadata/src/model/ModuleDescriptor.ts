import path from 'node:path';
import fs from 'node:fs/promises';

import { type EggProtoImplClass, type ProtoDescriptor } from '@eggjs/tegg-types';
import { PrototypeUtil } from '@eggjs/core-decorator';

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
        .map(t => {
          return ModuleDescriptorDumper.stringifyClazz(t, moduleDescriptor);
        })
        .join(',')}],` +
      `"multiInstanceClazzList": [${moduleDescriptor.multiInstanceClazzList
        .map(t => {
          return ModuleDescriptorDumper.stringifyClazz(t, moduleDescriptor);
        })
        .join(',')}],` +
      `"protos": [${moduleDescriptor.protos
        .map(t => {
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

  static async dump(desc: ModuleDescriptor, options?: ModuleDumpOptions): Promise<void> {
    const dumpPath = ModuleDescriptorDumper.dumpPath(desc, options);
    await fs.mkdir(path.dirname(dumpPath), { recursive: true });
    await fs.writeFile(dumpPath, ModuleDescriptorDumper.stringifyDescriptor(desc));
  }
}
