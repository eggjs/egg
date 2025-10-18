import {
  AccessLevel,
  type EggProtoImplClass,
  EggQualifierAttribute,
  EggType,
  InitTypeQualifierAttribute,
  LoadUnitNameQualifierAttribute,
  ModuleConfigs,
  ObjectInitType,
  PrototypeUtil,
  QualifierUtil,
  type ModuleConfigHolder,
  ConfigSourceQualifierAttribute,
} from '@eggjs/tegg';
import { ModuleConfigUtil } from '@eggjs/tegg/helper';
import { Application } from 'egg';
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
      const moduleName = ModuleConfigUtil.readModuleNameSync(reference.path);
      const defaultConfig = ModuleConfigUtil.loadModuleConfigSync(reference.path, undefined, this.app.config.env);
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
