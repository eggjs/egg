import {
  crossCutGraphHook,
  EggObjectAopHook,
  EggPrototypeCrossCutHook,
  LoadUnitAopHook,
  pointCutGraphHook,
} from '@eggjs/aop-runtime';
import {
  DalTableEggPrototypeHook,
  DalModuleLoadUnitHook,
  MysqlDataSourceManager,
  SqlMapManager,
  TableModelManager,
  TransactionPrototypeHook,
} from '@eggjs/dal-plugin';
import {
  type EggPrototype,
  EggPrototypeLifecycleUtil,
  GlobalGraph,
  type LoadUnit,
  LoadUnitFactory,
  LoadUnitLifecycleUtil,
  LoadUnitMultiInstanceProtoHook,
} from '@eggjs/metadata';
import {
  type EggProtoImplClass,
  PrototypeUtil,
  type ModuleConfigHolder,
  ModuleConfigs,
  ConfigSourceQualifierAttribute,
  type Logger,
} from '@eggjs/tegg';
import {
  ModuleConfigUtil,
  type ModuleReference,
  type ReadModuleReferenceOptions,
  type RuntimeConfig,
} from '@eggjs/tegg-common-util';
import {
  ContextHandler,
  EggContainerFactory,
  type EggContext,
  EggObjectLifecycleUtil,
  type LoadUnitInstance,
  LoadUnitInstanceFactory,
  ModuleLoadUnitInstance,
} from '@eggjs/tegg-runtime';
import { CrosscutAdviceFactory } from '@eggjs/tegg/aop';
import { StandaloneUtil, type MainRunner } from '@eggjs/tegg/standalone';

import { ConfigSourceLoadUnitHook } from './ConfigSourceLoadUnitHook.ts';
import { EggModuleLoader } from './EggModuleLoader.ts';
import { StandaloneContext } from './StandaloneContext.ts';
import { StandaloneContextHandler } from './StandaloneContextHandler.ts';
import { type InnerObject, StandaloneLoadUnit, StandaloneLoadUnitType } from './StandaloneLoadUnit.ts';

export interface ModuleDependency extends ReadModuleReferenceOptions {
  baseDir: string;
}

export interface RunnerOptions {
  /**
   * @deprecated
   * use inner object handlers instead
   */
  innerObjects?: Record<string, object>;
  env?: string;
  name?: string;
  innerObjectHandlers?: Record<string, InnerObject[]>;
  dependencies?: (string | ModuleDependency)[];
  dump?: boolean;
}

export class Runner {
  readonly cwd: string;
  readonly moduleReferences: readonly ModuleReference[];
  readonly moduleConfigs: Record<string, ModuleConfigHolder>;
  readonly env?: string;
  readonly name?: string;
  readonly options?: RunnerOptions;
  private loadUnitLoader: EggModuleLoader;
  private runnerProto: EggPrototype;
  private configSourceEggPrototypeHook: ConfigSourceLoadUnitHook;
  private loadUnitMultiInstanceProtoHook: LoadUnitMultiInstanceProtoHook;
  private dalTableEggPrototypeHook: DalTableEggPrototypeHook;
  private dalModuleLoadUnitHook: DalModuleLoadUnitHook;
  private transactionPrototypeHook: TransactionPrototypeHook;

  private crosscutAdviceFactory: CrosscutAdviceFactory;
  private loadUnitAopHook: LoadUnitAopHook;
  private eggPrototypeCrossCutHook: EggPrototypeCrossCutHook;
  private eggObjectAopHook: EggObjectAopHook;

  loadUnits: LoadUnit[] = [];
  loadUnitInstances: LoadUnitInstance[] = [];
  innerObjects: Record<string, InnerObject[]>;

  constructor(cwd: string, options?: RunnerOptions) {
    this.cwd = cwd;
    this.env = options?.env;
    this.name = options?.name;
    this.options = options;
    this.moduleReferences = Runner.getModuleReferences(this.cwd, options?.dependencies);
    this.moduleConfigs = {};
    this.innerObjects = {
      moduleConfigs: [
        {
          obj: new ModuleConfigs(this.moduleConfigs),
        },
      ],
      moduleConfig: [],
      mysqlDataSourceManager: [
        {
          obj: MysqlDataSourceManager.instance,
        },
      ],
    };

    const runtimeConfig: Partial<RuntimeConfig> = {
      baseDir: this.cwd,
      name: this.name,
      env: this.env,
    };
    // Inject runtimeConfig
    this.innerObjects.runtimeConfig = [
      {
        obj: runtimeConfig,
      },
    ];

    // load module.yml and module.env.yml by default
    if (!ModuleConfigUtil.configNames) {
      ModuleConfigUtil.configNames = ['module.default', `module.${this.env}`];
    }
    for (const reference of this.moduleReferences) {
      const absoluteRef = {
        path: ModuleConfigUtil.resolveModuleDir(reference.path, this.cwd),
        name: reference.name,
      };

      const moduleName = ModuleConfigUtil.readModuleNameSync(absoluteRef.path);
      this.moduleConfigs[moduleName] = {
        name: moduleName,
        reference: absoluteRef,
        config: ModuleConfigUtil.loadModuleConfigSync(absoluteRef.path),
      };
    }
    for (const moduleConfig of Object.values(this.moduleConfigs)) {
      this.innerObjects.moduleConfig.push({
        obj: moduleConfig.config,
        qualifiers: [
          {
            attribute: ConfigSourceQualifierAttribute,
            value: moduleConfig.name,
          },
        ],
      });
    }
    if (options?.innerObjects) {
      for (const [name, obj] of Object.entries(options.innerObjects)) {
        this.innerObjects[name] = [
          {
            obj,
          },
        ];
      }
    } else if (options?.innerObjectHandlers) {
      Object.assign(this.innerObjects, options.innerObjectHandlers);
    }
  }

  async load(): Promise<LoadUnit[]> {
    StandaloneContextHandler.register();
    LoadUnitFactory.registerLoadUnitCreator(StandaloneLoadUnitType, () => {
      return new StandaloneLoadUnit(this.innerObjects);
    });
    LoadUnitInstanceFactory.registerLoadUnitInstanceClass(
      StandaloneLoadUnitType,
      ModuleLoadUnitInstance.createModuleLoadUnitInstance,
    );
    const standaloneLoadUnit = await LoadUnitFactory.createLoadUnit(
      'MockStandaloneLoadUnitPath',
      StandaloneLoadUnitType,
      {
        async load(): Promise<EggProtoImplClass[]> {
          return [];
        },
      },
    );
    const loadUnits = await this.loadUnitLoader.load();
    return [standaloneLoadUnit, ...loadUnits];
  }

  static getModuleReferences(cwd: string, dependencies?: RunnerOptions['dependencies']): readonly ModuleReference[] {
    const moduleDirs = (dependencies || []).concat(cwd);
    return moduleDirs.reduce(
      (list, baseDir) => {
        const module = typeof baseDir === 'string' ? { baseDir } : baseDir;
        return list.concat(...ModuleConfigUtil.readModuleReference(module.baseDir, module));
      },
      [] as readonly ModuleReference[],
    );
  }

  static async preLoad(cwd: string, dependencies?: RunnerOptions['dependencies']): Promise<void> {
    const moduleReferences = Runner.getModuleReferences(cwd, dependencies);
    await EggModuleLoader.preLoad(moduleReferences, {
      baseDir: cwd,
      logger: console,
      dump: false,
    });
  }

  private async initLoaderInstance() {
    this.loadUnitLoader = new EggModuleLoader(this.moduleReferences, {
      logger: ((this.innerObjects.logger && this.innerObjects.logger[0])?.obj as Logger) || console,
      baseDir: this.cwd,
      dump: this.options?.dump,
    });
    await this.loadUnitLoader.init();
    GlobalGraph.instance!.registerBuildHook(crossCutGraphHook);
    GlobalGraph.instance!.registerBuildHook(pointCutGraphHook);
    const configSourceEggPrototypeHook = new ConfigSourceLoadUnitHook();
    LoadUnitLifecycleUtil.registerLifecycle(configSourceEggPrototypeHook);

    // TODO refactor with egg module
    // aop runtime
    this.crosscutAdviceFactory = new CrosscutAdviceFactory();
    this.loadUnitAopHook = new LoadUnitAopHook(this.crosscutAdviceFactory);
    this.eggPrototypeCrossCutHook = new EggPrototypeCrossCutHook(this.crosscutAdviceFactory);
    this.eggObjectAopHook = new EggObjectAopHook();

    EggPrototypeLifecycleUtil.registerLifecycle(this.eggPrototypeCrossCutHook);
    LoadUnitLifecycleUtil.registerLifecycle(this.loadUnitAopHook);
    EggObjectLifecycleUtil.registerLifecycle(this.eggObjectAopHook);

    this.loadUnitMultiInstanceProtoHook = new LoadUnitMultiInstanceProtoHook();
    LoadUnitLifecycleUtil.registerLifecycle(this.loadUnitMultiInstanceProtoHook);

    const loggerInnerObject = this.innerObjects.logger && this.innerObjects.logger[0];
    const logger = (loggerInnerObject?.obj || console) as Logger;

    this.dalModuleLoadUnitHook = new DalModuleLoadUnitHook(this.env ?? '', this.moduleConfigs, logger);
    this.dalTableEggPrototypeHook = new DalTableEggPrototypeHook(logger);
    this.transactionPrototypeHook = new TransactionPrototypeHook(this.moduleConfigs, logger);
    EggPrototypeLifecycleUtil.registerLifecycle(this.dalTableEggPrototypeHook);
    EggPrototypeLifecycleUtil.registerLifecycle(this.transactionPrototypeHook);
    LoadUnitLifecycleUtil.registerLifecycle(this.dalModuleLoadUnitHook);
  }

  async init(): Promise<void> {
    await this.initLoaderInstance();

    this.loadUnits = await this.load();
    const instances: LoadUnitInstance[] = [];
    for (const loadUnit of this.loadUnits) {
      const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
      instances.push(instance);
    }
    this.loadUnitInstances = instances;
    const runnerClass = StandaloneUtil.getMainRunner();
    if (!runnerClass) {
      throw new Error('not found runner class. Do you add @Runner decorator?');
    }
    const proto = PrototypeUtil.getClazzProto(runnerClass);
    if (!proto) {
      throw new Error(`can not get proto for clazz ${runnerClass.name}`);
    }
    this.runnerProto = proto as EggPrototype;
  }

  async run<T>(aCtx?: EggContext): Promise<T> {
    const lifecycle = {};
    const ctx = aCtx || new StandaloneContext();
    return await ContextHandler.run(ctx, async () => {
      if (ctx.init) {
        await ctx.init(lifecycle);
      }
      const eggObject = await EggContainerFactory.getOrCreateEggObject(this.runnerProto);
      const runner = eggObject.obj as MainRunner<T>;
      try {
        return await runner.main();
      } finally {
        if (ctx.destroy) {
          ctx.destroy(lifecycle).catch((e) => {
            e.message = `[tegg/standalone] destroy tegg context failed: ${e.message}`;
            console.warn(e);
          });
        }
      }
    });
  }

  async destroy(): Promise<void> {
    if (this.loadUnitInstances) {
      for (const instance of this.loadUnitInstances) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      }
    }
    if (this.loadUnits) {
      for (const loadUnit of this.loadUnits) {
        await LoadUnitFactory.destroyLoadUnit(loadUnit);
      }
    }
    if (this.configSourceEggPrototypeHook) {
      LoadUnitLifecycleUtil.deleteLifecycle(this.configSourceEggPrototypeHook);
    }

    if (this.eggPrototypeCrossCutHook) {
      EggPrototypeLifecycleUtil.deleteLifecycle(this.eggPrototypeCrossCutHook);
    }
    if (this.loadUnitAopHook) {
      LoadUnitLifecycleUtil.deleteLifecycle(this.loadUnitAopHook);
    }
    if (this.eggObjectAopHook) {
      EggObjectLifecycleUtil.deleteLifecycle(this.eggObjectAopHook);
    }

    if (this.loadUnitMultiInstanceProtoHook) {
      LoadUnitLifecycleUtil.deleteLifecycle(this.loadUnitMultiInstanceProtoHook);
    }

    if (this.dalTableEggPrototypeHook) {
      EggPrototypeLifecycleUtil.deleteLifecycle(this.dalTableEggPrototypeHook);
    }
    if (this.dalModuleLoadUnitHook) {
      LoadUnitLifecycleUtil.deleteLifecycle(this.dalModuleLoadUnitHook);
    }
    if (this.transactionPrototypeHook) {
      EggPrototypeLifecycleUtil.deleteLifecycle(this.transactionPrototypeHook);
    }
    MysqlDataSourceManager.instance.clear();
    SqlMapManager.instance.clear();
    TableModelManager.instance.clear();
    // clear configNames
    ModuleConfigUtil.setConfigNames(undefined);
  }
}
