import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { LoaderFS } from '@eggjs/loader-fs';
import { type EggPrototype, EggPrototypeFactory, type LoadUnit, LoadUnitFactory } from '@eggjs/metadata';
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

/**
 * Construction-time wiring: capabilities and provided objects. No app binding
 * happens here — WHICH app to load (baseDir/name/env) arrives at init().
 */
export interface StandaloneAppInit {
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
   * Host-provided inner objects. The framework placeholders
   * (moduleConfigs/moduleConfig/runtimeConfig) always win on name clash;
   * a `logger` entry here wins over the `logger` option.
   */
  innerObjects?: Record<string, InnerObject[]>;
  /**
   * Logger used by the framework (loader, hooks) and injectable as the
   * `logger` inner object. Defaults to console.
   */
  logger?: Logger;
}

/** init()-time binding: which app to load and its runtime identity. */
export interface InitStandaloneAppOptions {
  name?: string;
  env?: string;
  baseDir: string;
  /** Extra module dirs (e.g. npm packages) joining the scan after framework deps. */
  dependencies?: (string | ModuleDependency)[];
  /**
   * Tegg manifest data (bundle mode). When provided the module scan reuses the
   * precomputed decorated files instead of globbing the file system.
   */
  manifest?: TeggManifestExtension;
  /** Virtual fs used together with manifest in bundle mode. */
  loaderFS?: LoaderFS;
}

/** Flat convenience options for the `main(cwd, options)` entry (cwd = baseDir). */
export interface StandaloneAppOptions {
  env?: string;
  name?: string;
  logger?: Logger;
  innerObjectHandlers?: Record<string, InnerObject[]>;
  dependencies?: (string | ModuleDependency)[];
  frameworkDeps?: (string | ModuleDependency)[];
  dump?: boolean;
  manifest?: TeggManifestExtension;
  loaderFS?: LoaderFS;
}

export class StandaloneApp {
  readonly #frameworkDeps: (string | ModuleDependency)[];
  readonly #dump: boolean;
  readonly #logger: Logger;
  readonly #innerObjects: Record<string, InnerObject[]>;
  readonly #moduleConfigs: Record<string, ModuleConfigHolder> = {};
  // In the constructor there is no runtime config yet — pre-create the object
  // so the runtimeConfig inner object can hold it; init() fills the values.
  readonly #runtimeConfig = {} as RuntimeConfig;
  #moduleReferences: readonly ModuleReference[] = [];
  #initialized = false;
  #loadUnitLoader: EggModuleLoader;
  #runnerProto: EggPrototype;

  loadUnits: LoadUnit[] = [];
  loadUnitInstances: LoadUnitInstance[] = [];

  // This app's own per-app TeggScope bag — all factories/managers/graph/config
  // names resolve here, so multiple StandaloneApps in one process stay isolated.
  readonly scopeBag: TeggScopeBag;

  constructor(init?: StandaloneAppInit) {
    this.#frameworkDeps = init?.frameworkDeps ?? [];
    this.#dump = init?.dump !== false;
    this.#innerObjects = this.#createInnerObjects(init);
    this.#logger = this.#innerObjects.logger[0].obj as Logger;
    this.scopeBag = TeggScope.createBag();
    TeggScope.registerScope(this.scopeBag);
  }

  /** Scanned during init(); empty before that. */
  get moduleReferences(): readonly ModuleReference[] {
    return this.#moduleReferences;
  }

  /** Loaded during init(); empty before that. */
  get moduleConfigs(): Record<string, ModuleConfigHolder> {
    return this.#moduleConfigs;
  }

  /** Run `fn` within THIS app's per-app scope so factories/managers resolve here. */
  private runInScope<R>(fn: () => R): R {
    return TeggScope.run(this.scopeBag, fn);
  }

  #createInnerObjects(init?: StandaloneAppInit): Record<string, InnerObject[]> {
    const frameworkInnerObjects = {
      // Framework hooks (e.g. DAL) inject `logger`; an init.innerObjects
      // entry wins over init.logger, console is the last resort.
      logger: [{ obj: init?.logger ?? console }],
      // Framework placeholders pre-created at construction and filled during
      // init() — the inner objects hold these same references unless the caller
      // intentionally overrides them below.
      moduleConfigs: [{ obj: new ModuleConfigs(this.#moduleConfigs) }],
      moduleConfig: [] as InnerObject[],
      runtimeConfig: [{ obj: this.#runtimeConfig }],
    };
    const reservedNames = ['moduleConfigs', 'moduleConfig', 'runtimeConfig'];
    for (const name of reservedNames) {
      if (init?.innerObjects?.[name]) {
        (init.logger ?? console).warn(
          `[tegg/standalone] innerObjectHandlers.${name} overrides the framework provided inner object`,
        );
      }
    }
    return Object.assign(frameworkInnerObjects, init?.innerObjects);
  }

  /** Fill the runtimeConfig placeholder and bind module config names. */
  #initRuntime(opts: InitStandaloneAppOptions): void {
    this.#runtimeConfig.name = opts.name ?? '';
    this.#runtimeConfig.env = opts.env ?? '';
    this.#runtimeConfig.baseDir = opts.baseDir;

    // load module.yml and module.env.yml by default
    // Always set configNames for this app invocation, since destroy() clears it
    // asynchronously and may not have completed before the next app is created.
    ModuleConfigUtil.configNames = opts.env ? ['module.default', `module.${opts.env}`] : ['module.default'];
  }

  /** Load every module's config and expose it as a qualified `moduleConfig` inner object. */
  #loadModuleConfigs(): void {
    for (const reference of this.#moduleReferences) {
      const resolved = ModuleConfigUtil.resolveModuleConfigTolerant(reference, this.#runtimeConfig.baseDir);
      const resolvedRef = {
        path: resolved.path,
        name: reference.name,
        package: reference.package,
        optional: reference.optional,
        loaderType: reference.loaderType,
      };
      this.#moduleConfigs[resolved.name] = {
        name: resolved.name,
        reference: resolvedRef,
        config: resolved.config,
      };
    }
    for (const moduleConfig of Object.values(this.#moduleConfigs)) {
      this.#innerObjects.moduleConfig.push({
        obj: moduleConfig.config,
        qualifiers: [
          {
            attribute: ConfigSourceQualifierAttribute,
            value: moduleConfig.name,
          },
        ],
      });
    }
  }

  static getModuleReferences(
    cwd: string,
    dependencies?: (string | ModuleDependency)[],
    frameworkDeps?: (string | ModuleDependency)[],
  ): readonly ModuleReference[] {
    // The standalone package itself is the built-in framework scan root: its
    // own package.json dependencies that declare `eggModule` (the aop/dal/
    // config plugin packages) are discovered through the SAME node_modules
    // convention as app dependencies — no hand-maintained package list.
    // `!test/**` keeps this package's own test fixture modules out of the
    // scan in workspace layouts (src/ in dev, dist/ when published — the
    // package root is one level up either way).
    const standaloneRoot: ModuleDependency = {
      baseDir: path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
      extraFilePattern: ['!test/**'],
    };
    // framework deps first so their modules are scanned ahead of app modules
    const moduleDirs = ([standaloneRoot] as (string | ModuleDependency)[])
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
    // framework module the app also depends on) — shared dedupe (first path
    // wins, conflicting duplicate names throw).
    return ModuleConfigUtil.deduplicateModules(references);
  }

  static async preLoad(
    cwd: string,
    dependencies?: (string | ModuleDependency)[],
    frameworkDeps?: (string | ModuleDependency)[],
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
        logger: options?.logger ?? console,
        baseDir: cwd,
        dump: false,
        loaderFS: options?.loaderFS,
      });
      await loader.init();
      return EggModuleLoader.buildTeggManifestData(moduleReferences, loader.moduleDescriptors);
    });
  }

  async #initLoaderInstance(opts: InitStandaloneAppOptions): Promise<void> {
    this.#loadUnitLoader = new EggModuleLoader(this.#moduleReferences, {
      logger: this.#logger,
      baseDir: opts.baseDir,
      dump: this.#dump,
      manifest: opts.manifest,
      loaderFS: opts.loaderFS,
    });
    await this.#loadUnitLoader.init();
  }

  /**
   * Phase 2: create AND instantiate the InnerObjectLoadUnit before the business
   * graph is built, so `@XxxLifecycleProto` hooks (including graph build hooks
   * they register in `@LifecyclePostInject`) are live for every later phase.
   */
  async #instantiateInnerObjectLoadUnit(): Promise<void> {
    StandaloneContextHandler.register();
    const builder = new InnerObjectLoadUnitBuilder();
    for (const moduleDescriptor of this.#loadUnitLoader.moduleDescriptors) {
      builder.addInnerObjectClazzList(moduleDescriptor.innerObjectClazzList, {
        name: moduleDescriptor.name,
        path: moduleDescriptor.unitPath,
      });
    }
    const innerObjectLoadUnit = await builder.createLoadUnit({
      innerObjects: this.#innerObjects,
    });
    this.loadUnits.push(innerObjectLoadUnit);
    const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(innerObjectLoadUnit);
    this.loadUnitInstances.push(instance);
  }

  /** Phase 3/4: build + sort the business graph, then create and instantiate module load units. */
  async #instantiateModuleLoadUnits(): Promise<void> {
    const loadUnits = await this.#loadUnitLoader.load();
    this.loadUnits.push(...loadUnits);
    for (const loadUnit of loadUnits) {
      const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
      this.loadUnitInstances.push(instance);
    }
  }

  #initRunner(): void {
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
    this.#runnerProto = proto as EggPrototype;
  }

  async init(opts: InitStandaloneAppOptions): Promise<void> {
    // Idempotent (same contract as ServiceWorkerApp.init): a second call must
    // not reload configs or re-create load units.
    if (this.#initialized) {
      return;
    }
    await this.runInScope(async () => {
      this.#initRuntime(opts);
      // In manifest-consume mode the module reference graph was already
      // captured at build time; reuse it instead of re-scanning the filesystem.
      this.#moduleReferences = opts.manifest?.moduleReferences?.length
        ? opts.manifest.moduleReferences
        : StandaloneApp.getModuleReferences(opts.baseDir, opts.dependencies, this.#frameworkDeps);
      this.#loadModuleConfigs();
      await this.#initLoaderInstance(opts);
      await this.#instantiateInnerObjectLoadUnit();
      await this.#instantiateModuleLoadUnits();
      this.#initRunner();
    });
    this.#initialized = true;
  }

  async run<T>(aCtx?: EggContext): Promise<T> {
    return this.runInScope(async () => {
      const lifecycle = {};
      const ctx = aCtx || new StandaloneContext();
      return await ContextHandler.run(ctx, async () => {
        if (ctx.init) {
          await ctx.init(lifecycle);
        }
        const eggObject = await EggContainerFactory.getOrCreateEggObject(this.#runnerProto);
        const runner = eggObject.obj as MainRunner<T>;
        try {
          return await runner.main();
        } finally {
          if (ctx.destroy) {
            await ctx.destroy(lifecycle).catch((e: unknown) => {
              if (e instanceof Error) {
                e.message = `[tegg/standalone] destroy tegg context failed: ${e.message}`;
                console.warn(e);
                return;
              }
              console.warn('[tegg/standalone] destroy tegg context failed:', e);
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
    // and deregister themselves — and clean up their own managers — when it
    // is destroyed above (dal: DalModuleLoadUnitHook#destroy).
    // clear configNames
    ModuleConfigUtil.setConfigNames(undefined);
  }
}
