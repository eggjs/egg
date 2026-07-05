import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MysqlDataSourceManager, SqlMapManager, TableModelManager } from '@eggjs/dal-plugin';
import type { LoaderFS } from '@eggjs/loader-fs';
import {
  ConfigSourceLoadUnitHook,
  type EggPrototype,
  EggPrototypeFactory,
  type LoadUnit,
  LoadUnitFactory,
} from '@eggjs/metadata';
import { type ModuleConfigHolder, ModuleConfigs, ConfigSourceQualifierAttribute, type Logger } from '@eggjs/tegg';
import {
  ModuleConfigUtil,
  type ModuleReference,
  type ReadModuleReferenceOptions,
  type RuntimeConfig,
} from '@eggjs/tegg-common-util';
import type { TeggManifestExtension } from '@eggjs/tegg-loader';
import {
  ContextHandler,
  EggContainerFactory,
  type EggContext,
  type InnerObject,
  InnerObjectLoadUnitBuilder,
  type LoadUnitInstance,
  LoadUnitInstanceFactory,
} from '@eggjs/tegg-runtime';
import { TeggScope } from '@eggjs/tegg-types';
import type { TeggScopeBag } from '@eggjs/tegg-types';
import { StandaloneUtil, type MainRunner } from '@eggjs/tegg/standalone';

import { EggModuleLoader } from './EggModuleLoader.ts';
import { StandaloneContext } from './StandaloneContext.ts';
import { StandaloneContextHandler } from './StandaloneContextHandler.ts';

export interface ModuleDependency extends ReadModuleReferenceOptions {
  baseDir: string;
}

export interface StandaloneAppOptions {
  /**
   * @deprecated
   * use inner object handlers instead
   */
  innerObjects?: Record<string, object>;
  env?: string;
  name?: string;
  innerObjectHandlers?: Record<string, InnerObject[]>;
  dependencies?: (string | ModuleDependency)[];
  /**
   * Framework-level module plugins loaded BEFORE the app's own modules
   * (e.g. a service-worker runtime package providing controller support).
   * They join the same scan; their `@InnerObjectProto` / `@XxxLifecycleProto`
   * classes are instantiated in the InnerObjectLoadUnit ahead of every
   * business load unit.
   */
  frameworkDeps?: (string | ModuleDependency)[];
  dump?: boolean;
  /**
   * Tegg manifest data (bundle mode). When provided the module scan reuses the
   * precomputed decorated files instead of globbing the file system.
   */
  manifest?: TeggManifestExtension;
  /** Virtual fs used together with manifest in bundle mode. */
  loaderFS?: LoaderFS;
}

export class StandaloneApp {
  readonly cwd: string;
  readonly moduleReferences: readonly ModuleReference[];
  readonly moduleConfigs: Record<string, ModuleConfigHolder>;
  readonly env?: string;
  readonly name?: string;
  readonly options?: StandaloneAppOptions;
  private loadUnitLoader: EggModuleLoader;
  private runnerProto: EggPrototype;

  loadUnits: LoadUnit[] = [];
  loadUnitInstances: LoadUnitInstance[] = [];
  innerObjects: Record<string, InnerObject[]>;

  // This app's own per-app TeggScope bag — all factories/managers/graph/config
  // names resolve here, so multiple StandaloneApps in one process stay isolated.
  readonly scopeBag: TeggScopeBag;

  constructor(cwd: string, options?: StandaloneAppOptions) {
    this.cwd = cwd;
    this.env = options?.env;
    this.name = options?.name;
    this.options = options;
    this.scopeBag = TeggScope.createBag();
    TeggScope.registerScope(this.scopeBag);
    try {
      this.moduleReferences = StandaloneApp.getModuleReferences(
        this.cwd,
        options?.dependencies,
        options?.frameworkDeps,
      );
      this.moduleConfigs = {};
      this.runInScope(() => this.initInnerObjectsAndConfigs(options));
    } catch (e) {
      // Construction failed after the scope was registered; release it so the
      // never-returned app does not leak into liveScopeBags.
      TeggScope.unregisterScope(this.scopeBag);
      throw e;
    }
  }

  /** Run `fn` within THIS app's per-app scope so factories/managers resolve here. */
  private runInScope<R>(fn: () => R): R {
    return TeggScope.run(this.scopeBag, fn);
  }

  private initInnerObjectsAndConfigs(options?: StandaloneAppOptions): void {
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
    // Always set configNames for this app invocation, since destroy() clears it
    // asynchronously and may not have completed before the next app is created.
    ModuleConfigUtil.configNames = ['module.default', `module.${this.env}`];
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
    // Framework hooks (e.g. DAL) inject `logger`; make sure it always resolves.
    this.innerObjects.logger ??= [{ obj: console }];
  }

  /**
   * Built-in framework module plugins, consumed through the SAME module scan
   * as any business module (their `@InnerObjectProto` / `@XxxLifecycleProto`
   * classes are diverted into the InnerObjectLoadUnit by loadApp) — no
   * hand-fed class lists. The packages declare `eggModule` metadata; the
   * default file pattern already excludes `test/`.
   */
  static builtinFrameworkModules(): ModuleDependency[] {
    // The packages ARE the modules; never pick their test fixture modules up
    // (workspace/dev layouts ship test/ next to src/).
    const scan = { extraFilePattern: ['!test/**'] };
    return [
      { baseDir: path.dirname(fileURLToPath(import.meta.resolve('@eggjs/aop-runtime/package.json'))), ...scan },
      { baseDir: path.dirname(fileURLToPath(import.meta.resolve('@eggjs/dal-plugin/package.json'))), ...scan },
    ];
  }

  static getModuleReferences(
    cwd: string,
    dependencies?: StandaloneAppOptions['dependencies'],
    frameworkDeps?: StandaloneAppOptions['frameworkDeps'],
  ): readonly ModuleReference[] {
    // framework deps first so their modules are scanned ahead of app modules
    const moduleDirs = (StandaloneApp.builtinFrameworkModules() as (string | ModuleDependency)[])
      .concat(frameworkDeps || [])
      .concat(dependencies || [])
      .concat(cwd);
    const references = moduleDirs.reduce(
      (list, baseDir) => {
        const module = typeof baseDir === 'string' ? { baseDir } : baseDir;
        return list.concat(...ModuleConfigUtil.readModuleReference(module.baseDir, module));
      },
      [] as readonly ModuleReference[],
    );
    // The same module may be reachable from multiple scan roots (a built-in
    // framework module the app also depends on); first reference wins.
    const seenPaths = new Set<string>();
    return references.filter((reference) => {
      if (seenPaths.has(reference.path)) {
        return false;
      }
      seenPaths.add(reference.path);
      return true;
    });
  }

  static async preLoad(
    cwd: string,
    dependencies?: StandaloneAppOptions['dependencies'],
    frameworkDeps?: StandaloneAppOptions['frameworkDeps'],
  ): Promise<void> {
    const moduleReferences = StandaloneApp.getModuleReferences(cwd, dependencies, frameworkDeps);
    await EggModuleLoader.preLoad(moduleReferences, {
      baseDir: cwd,
      logger: console,
      dump: false,
    });
  }

  /**
   * Scan-only metadata generation entry (the standalone counterpart of the egg
   * plugin's loadMetadata): produce the tegg manifest extension a bundler can
   * persist, without instantiating anything. Runs in a temporary scope so no
   * state leaks into the process-default bag.
   */
  static async loadMetadata(cwd: string, options?: StandaloneAppOptions): Promise<TeggManifestExtension> {
    const moduleReferences = StandaloneApp.getModuleReferences(cwd, options?.dependencies, options?.frameworkDeps);
    return await TeggScope.run(TeggScope.createBag(), async () => {
      const loader = new EggModuleLoader(moduleReferences, {
        logger: console,
        baseDir: cwd,
        dump: false,
        loaderFS: options?.loaderFS,
      });
      await loader.init();
      return EggModuleLoader.buildTeggManifestData(moduleReferences, loader.moduleDescriptors);
    });
  }

  private async initLoaderInstance(): Promise<void> {
    this.loadUnitLoader = new EggModuleLoader(this.moduleReferences, {
      logger: ((this.innerObjects.logger && this.innerObjects.logger[0])?.obj as Logger) || console,
      baseDir: this.cwd,
      dump: this.options?.dump,
      manifest: this.options?.manifest,
      loaderFS: this.options?.loaderFS,
    });
    await this.loadUnitLoader.init();
  }

  /**
   * Phase 2: create AND instantiate the InnerObjectLoadUnit before the business
   * graph is built, so `@XxxLifecycleProto` hooks (including graph build hooks
   * they register in `@LifecyclePostInject`) are live for every later phase.
   */
  private async instantiateInnerObjectLoadUnit(): Promise<void> {
    StandaloneContextHandler.register();
    const builder = new InnerObjectLoadUnitBuilder();
    // Built-in framework module plugins (declarative hooks in their own packages).
    builder.addInnerObjectClazzList([ConfigSourceLoadUnitHook], {
      name: 'standalone',
      path: 'tegg:standalone',
    });
    for (const moduleDescriptor of this.loadUnitLoader.moduleDescriptors) {
      builder.addInnerObjectClazzList(moduleDescriptor.innerObjectClazzList, {
        name: moduleDescriptor.name,
        path: moduleDescriptor.unitPath,
      });
    }
    const innerObjectLoadUnit = await builder.createLoadUnit({
      innerObjects: this.innerObjects,
    });
    this.loadUnits.push(innerObjectLoadUnit);
    const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(innerObjectLoadUnit);
    this.loadUnitInstances.push(instance);
  }

  /** Phase 3/4: build + sort the business graph, then create and instantiate module load units. */
  private async instantiateModuleLoadUnits(): Promise<void> {
    const loadUnits = await this.loadUnitLoader.load();
    this.loadUnits.push(...loadUnits);
    for (const loadUnit of loadUnits) {
      const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
      this.loadUnitInstances.push(instance);
    }
  }

  private initRunner(): void {
    const runnerClass = StandaloneUtil.getMainRunner();
    if (!runnerClass) {
      throw new Error('not found runner class. Do you add @Runner decorator?');
    }
    // Prefer the per-app scoped lookup so parallel apps don't fall back to
    // process-global class metadata when a per-scope prototype is registered.
    const proto = EggPrototypeFactory.instance.getPrototypeByClazzOrGlobal(runnerClass);
    if (!proto) {
      throw new Error(`can not get proto for clazz ${runnerClass.name}`);
    }
    this.runnerProto = proto as EggPrototype;
  }

  async init(): Promise<void> {
    await this.runInScope(async () => {
      await this.initLoaderInstance();
      await this.instantiateInnerObjectLoadUnit();
      await this.instantiateModuleLoadUnits();
      this.initRunner();
    });
  }

  async run<T>(aCtx?: EggContext): Promise<T> {
    return this.runInScope(async () => {
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
    });
  }

  async destroy(): Promise<void> {
    try {
      await this.runInScope(() => this.doDestroy());
    } finally {
      // Always release the scope, even if doDestroy rejects, so liveScopeBags
      // (and thus isMultiApp / the sole-app fallback) never leaks a dead app.
      TeggScope.unregisterScope(this.scopeBag);
    }
  }

  private async doDestroy(): Promise<void> {
    // Reverse creation order: business load units go down first, the
    // InnerObjectLoadUnit last — its lifecycle protos stay registered until
    // every object they may hook has been destroyed.
    if (this.loadUnitInstances) {
      for (const instance of [...this.loadUnitInstances].reverse()) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      }
    }
    if (this.loadUnits) {
      for (const loadUnit of [...this.loadUnits].reverse()) {
        await LoadUnitFactory.destroyLoadUnit(loadUnit);
      }
    }
    // Framework hooks (ConfigSource/AOP/DAL) live in the InnerObjectLoadUnit
    // and deregister themselves when it is destroyed above.
    MysqlDataSourceManager.instance.clear();
    SqlMapManager.instance.clear();
    TableModelManager.instance.clear();
    // clear configNames
    ModuleConfigUtil.setConfigNames(undefined);
  }
}
