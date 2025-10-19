import path from 'node:path';
import { readFileSync } from 'node:fs';
import { debuglog } from 'node:util';

import { ModuleConfigUtil, type ModuleReference, type ReadModuleReferenceOptions } from '@eggjs/tegg-common-util';
import { importResolve } from '@eggjs/utils';

const debug = debuglog('egg/tegg/plugin/config/ModuleScanner');

export class ModuleScanner {
  private readonly baseDir: string;
  private readonly readModuleOptions: ReadModuleReferenceOptions;

  constructor(baseDir: string, readModuleOptions: ReadModuleReferenceOptions) {
    this.baseDir = baseDir;
    this.readModuleOptions = readModuleOptions;
  }

  /**
   * - load module references from config or scan from baseDir
   * - load framework module as optional module reference
   */
  loadModuleReferences(): readonly ModuleReference[] {
    const moduleReferences = ModuleConfigUtil.readModuleReference(this.baseDir, this.readModuleOptions || {});
    const appPkg: { egg?: { framework?: string } } = JSON.parse(
      readFileSync(path.join(this.baseDir, 'package.json'), 'utf-8')
    );
    const framework = appPkg.egg?.framework;
    if (!framework) {
      return moduleReferences;
    }
    const frameworkPkg = importResolve(`${framework}/package.json`, {
      paths: [this.baseDir],
    });
    const frameworkDir = path.dirname(frameworkPkg);
    debug('loadModuleReferences from framework:%o, frameworkDir:%o', framework, frameworkDir);
    const optionalModuleReferences = ModuleConfigUtil.readModuleReference(frameworkDir, this.readModuleOptions || {});
    const result = [...moduleReferences];
    for (const optionalModuleReference of optionalModuleReferences) {
      if (!result.some(t => t.path === optionalModuleReference.path)) {
        result.push({
          ...optionalModuleReference,
          optional: true,
        });
      }
    }
    return result;
  }
}
