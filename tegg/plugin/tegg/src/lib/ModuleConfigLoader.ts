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
      const resolved = ModuleConfigUtil.resolveModuleConfigTolerant(reference, this.app.baseDir, this.app.config.env);
      // @eggjs/tegg-config moduleConfigs[module].config overwrite
      const config = extend(true, {}, resolved.config, this.app.moduleConfigs[resolved.name]?.config);
      moduleConfigMap[resolved.name] = {
        name: resolved.name,
        reference: {
          name: resolved.name,
          package: reference.package,
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
      QualifierUtil.addProtoQualifier(func, ConfigSourceQualifierAttribute, resolved.name);
      result.push(func);
    }
    const moduleConfigs = this.loadModuleConfigs(moduleConfigMap);
    result.push(moduleConfigs);
    return result;
  }
}
