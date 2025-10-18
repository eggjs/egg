import { Application } from 'egg';
import { MODEL_PROTO_IMPL_TYPE } from '@eggjs/tegg-orm-decorator';

import { Orm } from './lib/SingletonORM.ts';
import { DataSourceManager } from './lib/DataSourceManager.ts';
import { LeoricRegister } from './lib/LeoricRegister.ts';
import { ModelProtoManager } from './lib/ModelProtoManager.ts';
import { ModelProtoHook } from './lib/ModelProtoHook.ts';
import SingletonModelProto from './lib/SingletonModelProto.ts';
import { SingletonModelObject } from './lib/SingletonModelObject.ts';
import { ORMLoadUnitHook } from './lib/ORMLoadUnitHook.ts';

export default class OrmAppBootHook {
  private readonly app: Application;
  private readonly dataSourceManager: DataSourceManager;
  private readonly leoricRegister: LeoricRegister;
  private readonly modelProtoManager: ModelProtoManager;
  private readonly modelProtoHook: ModelProtoHook;
  private readonly ormLoadUnitHook: ORMLoadUnitHook;

  constructor(app: Application) {
    this.app = app;
    this.dataSourceManager = new DataSourceManager();
    this.modelProtoManager = new ModelProtoManager();
    this.leoricRegister = new LeoricRegister(this.modelProtoManager, this.dataSourceManager);
    this.modelProtoHook = new ModelProtoHook(this.modelProtoManager);
    this.app.eggPrototypeCreatorFactory.registerPrototypeCreator(
      MODEL_PROTO_IMPL_TYPE,
      SingletonModelProto.createProto
    );
    this.app.leoricRegister = this.leoricRegister;
    this.ormLoadUnitHook = new ORMLoadUnitHook();
  }

  configWillLoad() {
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.modelProtoHook);
    this.app.eggObjectFactory.registerEggObjectCreateMethod(SingletonModelProto, SingletonModelObject.createObject);
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.ormLoadUnitHook);
  }

  configDidLoad() {
    const config = this.app.config.orm;
    if (config.datasources) {
      for (const datasource of config.datasources) {
        this.dataSourceManager.addConfig(datasource);
      }
    } else {
      this.dataSourceManager.addDefaultConfig(config);
    }
  }

  async didLoad() {
    await this.app.moduleHandler.ready();
    await this.leoricRegister.register();
  }

  async beforeClose() {
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.modelProtoHook);
  }
}

declare module 'egg' {
  interface Application {
    leoricRegister: LeoricRegister;
    orm: Orm;
  }
}
