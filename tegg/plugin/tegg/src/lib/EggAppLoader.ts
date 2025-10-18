import { Application } from 'egg';
import { type Loader, TeggError } from '@eggjs/tegg-metadata';
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
} from '@eggjs/tegg';
import { ObjectUtils } from '@eggjs/tegg-common-util';
import { BackgroundTaskHelper } from '@eggjs/tegg-background-task';
import { EggObjectFactory } from '@eggjs/tegg-dynamic-inject-runtime';

import { ModuleConfigLoader } from './ModuleConfigLoader.ts';
import { COMPATIBLE_PROTO_IMPLE_TYPE } from './EggCompatibleProtoImpl.ts';

export const APP_CLAZZ_BLACK_LIST = ['eggObjectFactory', 'moduleConfigs'];

export const CONTEXT_CLAZZ_BLACK_LIST = [
  // just use the app.logger, ctx logger is deprecated.
  'logger',
];
export const DEFAULT_APP_CLAZZ: string[] = [];
export const DEFAULT_CONTEXT_CLAZZ = ['user'];

export class EggAppLoader implements Loader {
  private readonly app: Application;
  private readonly moduleConfigLoader: ModuleConfigLoader;

  constructor(app: Application) {
    this.app = app;
    this.moduleConfigLoader = new ModuleConfigLoader(this.app);
  }

  private buildClazz(name: string, eggType: EggType): EggProtoImplClass {
    const app = this.app;
    let func: EggProtoImplClass;
    if (eggType === EggType.APP) {
      func = function () {
        return app[name as keyof Application];
      } as any;
    } else {
      func = function () {
        const ctx = app.currentContext;
        if (!ctx) {
          // ctx has been destroyed, throw humanize error info
          throw TeggError.create(
            `Can not read property \`${name}\` because egg ctx has been destroyed`,
            'read_after_ctx_destroyed'
          );
        }

        return ctx[name];
      } as any;
    }
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
    QualifierUtil.addProtoQualifier(func, EggQualifierAttribute, eggType);
    return func;
  }

  private buildAppLoggerClazz(name: string): EggProtoImplClass {
    const app = this.app;
    const func: EggProtoImplClass = function () {
      return app.getLogger(name);
    } as any;
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

  private getLoggerNames(ctxClazzNames: string[], singletonClazzNames: string[]): string[] {
    const loggerNames = Array.from(this.app.loggers.keys());
    // filter logger/coreLogger
    return loggerNames.filter(t => !ctxClazzNames.includes(t) && !singletonClazzNames.includes(t));
  }

  async load(): Promise<EggProtoImplClass[]> {
    const app = this.app;
    const appProperties = ObjectUtils.getProperties(app);
    const contextProperties = ObjectUtils.getProperties((app as any).context);
    // custom plugin may define property conflict with default list
    const allSingletonClazzNameSet = new Set([...appProperties, ...DEFAULT_APP_CLAZZ]);
    APP_CLAZZ_BLACK_LIST.forEach(t => allSingletonClazzNameSet.delete(t));
    const allSingletonClazzNames = Array.from(allSingletonClazzNameSet);
    const allContextClazzNamesSet = new Set([...contextProperties, ...DEFAULT_CONTEXT_CLAZZ]);
    CONTEXT_CLAZZ_BLACK_LIST.forEach(t => allContextClazzNamesSet.delete(t));
    const allContextClazzNames = Array.from(allContextClazzNamesSet);
    const loggerNames = this.getLoggerNames(allContextClazzNames, allSingletonClazzNames);
    const allSingletonClazzs = allSingletonClazzNames.map(name => this.buildClazz(name, EggType.APP));
    const allContextClazzs = allContextClazzNames.map(name => this.buildClazz(name, EggType.CONTEXT));
    const appLoggerClazzs = loggerNames.map(name => this.buildAppLoggerClazz(name));
    const moduleConfigList = this.moduleConfigLoader.loadModuleConfigList();

    return [
      ...allSingletonClazzs,
      ...allContextClazzs,
      ...appLoggerClazzs,
      ...moduleConfigList,

      // inner helper class list
      // TODO: should auto the inner class
      BackgroundTaskHelper,
      EggObjectFactory,
    ];
  }
}
