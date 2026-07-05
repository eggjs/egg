import fs from 'node:fs';
import path from 'node:path';

import {
  AccessLevel,
  type EggProtoImplClass,
  EggQualifierAttribute,
  EggType,
  InitTypeQualifierAttribute,
  LoadUnitNameQualifierAttribute,
  ObjectInitType,
  PrototypeUtil,
  QualifierUtil,
  ConfigSourceQualifierAttribute,
} from '@eggjs/core-decorator';
import { ModuleConfigs, ModuleConfigUtil } from '@eggjs/tegg-common-util';
import type { ModuleConfigHolder } from '@eggjs/tegg-types';
import type { Application } from 'egg';
import { extend } from 'extend2';

import { COMPATIBLE_PROTO_IMPLE_TYPE } from './EggCompatibleProtoImpl.ts';

export class ModuleConfigLoader {
  readonly app: Application;
  constructor(app: Application) {
    this.app = app;
  }

  private loadModuleConfigs(moduleConfigMap: Record<string, ModuleConfigHolder>): EggProtoImplClass {
    const moduleConfigs = new ModuleConfigs(moduleConfigMap);
    const func: EggProtoImplClass = function () {
      return moduleConfigs;
    } as any;
    const name = 'moduleConfigs';
    Object.defineProperty(func, 'name', {
      value: name,
      writable: false,
      enumerable: false,
      configurable: true,
    });
    PrototypeUtil.setIsEggPrototype(func);
    PrototypeUtil.setFilePath(func, 'mock_file_path');
    PrototypeUtil.setProperty(func, {
      name,
      initType: ObjectInitType.SINGLETON,
      accessLevel: AccessLevel.PUBLIC,
      protoImplType: COMPATIBLE_PROTO_IMPLE_TYPE,
    });
    QualifierUtil.addProtoQualifier(func, LoadUnitNameQualifierAttribute, 'app');
    QualifierUtil.addProtoQualifier(func, InitTypeQualifierAttribute, ObjectInitType.SINGLETON);
    QualifierUtil.addProtoQualifier(func, EggQualifierAttribute, EggType.APP);
    return func;
  }

  loadModuleConfigList(): EggProtoImplClass[] {
    const result: EggProtoImplClass[] = [];
    const moduleConfigMap: Record<string, ModuleConfigHolder> = {};
    for (const reference of this.app.moduleReferences) {
      // Same tolerance as the config plugin's loadModuleConfigs: framework
      // plugin modules restored from a bundle manifest are NOT materialized
      // inside the bundle output (their code ships externally), so read the
      // manifest-carried name instead of a package.json that does not exist.
      const modulePath = path.isAbsolute(reference.path)
        ? reference.path
        : path.resolve(this.app.baseDir, reference.path);
      const moduleDirExists = fs.existsSync(modulePath);
      const moduleName =
        !moduleDirExists && reference.name ? reference.name : ModuleConfigUtil.readModuleNameSync(modulePath);
      const defaultConfig = moduleDirExists
        ? ModuleConfigUtil.loadModuleConfigSync(modulePath, undefined, this.app.config.env)
        : undefined;
      // @eggjs/tegg-config moduleConfigs[module].config overwrite
      const config = extend(true, {}, defaultConfig, this.app.moduleConfigs[moduleName]?.config);
      moduleConfigMap[moduleName] = {
        name: moduleName,
        reference: {
          name: moduleName,
          path: reference.path,
        },
        config,
      };

      const func: EggProtoImplClass = function () {
        return config;
      } as any;
      const name = 'moduleConfig';
      Object.defineProperty(func, 'name', {
        value: name,
        writable: false,
        enumerable: false,
        configurable: true,
      });
      PrototypeUtil.setIsEggPrototype(func);
      PrototypeUtil.setFilePath(func, 'mock_file_path');
      PrototypeUtil.setProperty(func, {
        name,
        initType: ObjectInitType.SINGLETON,
        accessLevel: AccessLevel.PUBLIC,
        protoImplType: COMPATIBLE_PROTO_IMPLE_TYPE,
      });
      QualifierUtil.addProtoQualifier(func, LoadUnitNameQualifierAttribute, 'app');
      QualifierUtil.addProtoQualifier(func, InitTypeQualifierAttribute, ObjectInitType.SINGLETON);
      QualifierUtil.addProtoQualifier(func, EggQualifierAttribute, EggType.APP);
      QualifierUtil.addProtoQualifier(func, ConfigSourceQualifierAttribute, moduleName);
      result.push(func);
    }
    const moduleConfigs = this.loadModuleConfigs(moduleConfigMap);
    result.push(moduleConfigs);
    return result;
  }
}
