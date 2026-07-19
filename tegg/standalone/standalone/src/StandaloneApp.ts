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
   * Host-provided inner objects. Framework-owned `config`, `moduleConfigs`,
   * `moduleConfig`, and `runtimeConfig` entries are ignored. `logger` is
   * reserved; use the dedicated `logger` option instead.
   */
  innerObjects?: Record<string, InnerObject[]>;
  /** User-facing option name for diagnostics. Defaults to `innerObjects`. */
  innerObjectsName?: string;
  /**
   * Logger used by the framework (loader, hooks) and exposed as the injectable
   * `logger` provided object. This is the only supported logger input. Defaults
   * to console.
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
  /** Host-provided objects other than `logger`; use the dedicated logger option. */
  innerObjectHandlers?: Record<string, InnerObject[]>;
  dependencies?: (string | ModuleDependency)[];
  frameworkDeps?: (string | ModuleDependency)[];
  dump?: boolean;
  manifest?: TeggManifestExtension;
  loaderFS?: LoaderFS;
}

type StandaloneAppState = 'new' | 'initializing' | 'ready' | 'closed';

export class StandaloneApp {
  readonly #frameworkDeps: (string | ModuleDependency)[];
  readonly #dump: boolean;
  readonly #logger: Logger;
  readonly #innerObjects: Record<string, InnerObject[]>;
  readonly #moduleConfigs: Record<string, ModuleConfigHolder> = {};
  // In the constructor there is no runtime config yet — pre-create the object
  // so the runtimeConfig inner object can hold it; init() fills the values.
  readonly #runtimeConfig = {} as RuntimeConfig;
  // The app-wide `config` inner object: the entry app module's module.yml.
  // Pre-created so the inner object can hold it; #loadModuleConfigs fills it
  // once the entry module is known.
  readonly #config: Record<string, unknown> = {};
  #appModuleName?: string;
  #moduleReferences: readonly ModuleReference[] = [];
  #state: StandaloneAppState = 'new';
  #runnerProto?: EggPrototype;
  #innerLoadUnit?: LoadUnit;
  #innerLoadUnitInstance?: LoadUnitInstance;
  readonly #loadUnits: LoadUnit[] = [];
  readonly #loadUnitInstances: LoadUnitInstance[] = [];

  // This app's own per-app TeggScope bag — all factories/managers/graph/config
  // names resolve here, so multiple StandaloneApps in one process stay isolated.
  readonly scopeBag: TeggScopeBag;

  constructor(init?: StandaloneAppInit) {
    this.#frameworkDeps = init?.frameworkDeps ?? [];
    this.#dump = init?.dump !== false;
    this.#logger = init?.logger ?? console;
    const innerObjectsName = init?.innerObjectsName ?? 'innerObjects';
    if (init?.innerObjects && Object.hasOwn(init.innerObjects, 'logger')) {
      throw new Error(`[tegg/standalone] ${innerObjectsName}.logger is reserved; use the logger option instead`);
    }
    this.#innerObjects = this.#createInnerObjects(init);
    this.scopeBag = TeggScope.createBag();
  }

  /** Run `fn` within THIS app's per-app scope so factories/managers resolve here. */
  private runInScope<R>(fn: () => R): R {
    return TeggScope.run(this.scopeBag, fn);
  }

  #createInnerObjects(init?: StandaloneAppInit): Record<string, InnerObject[]> {
    return {
      ...init?.innerObjects,
      // Framework placeholders pre-created at construction and filled during
      // init() — the inner objects hold these same references unless the caller
      // supplies objects with other names.
      logger: [{ obj: this.#logger }],
      config: [{ obj: this.#config }],
      moduleConfigs: [{ obj: new ModuleConfigs(this.#moduleConfigs) }],
      moduleConfig: [] as InnerObject[],
      runtimeConfig: [{ obj: this.#runtimeConfig }],
    };
  }

  /** Fill the runtimeConfig placeholder and bind module config names. */
  #initRuntime(opts: InitStandaloneAppOptions): void {
    this.#runtimeConfig.name = opts.name ?? '';
    this.#runtimeConfig.env = opts.env ?? '';
    this.#runtimeConfig.baseDir = opts.baseDir;

    // Load module.default.yml and module.${env}.yml by default. A host that
    // needs a custom config-name selection chain sets `ModuleConfigUtil.configNames`
    // inside this app's TeggScope bag before init(); only fill the default when
    // nothing was pre-set, so that override is not clobbered.
    if (ModuleConfigUtil.configNames === undefined) {
      ModuleConfigUtil.configNames = opts.env ? ['module.default', `module.${opts.env}`] : ['module.default'];
    }
  }

  /** Load every module's config and expose it as a qualified `moduleConfig` inner object. */
  #loadModuleConfigs(): void {
    const baseDir = path.resolve(this.#runtimeConfig.baseDir);
    const resolvedReferences: ModuleReference[] = [];
    for (const reference of this.#moduleReferences) {
      const resolved = ModuleConfigUtil.resolveModuleConfigTolerant(reference, this.#runtimeConfig.baseDir);
      const resolvedRef = {
        path: resolved.path,
        name: resolved.name,
        package: reference.package,
        optional: reference.optional,
        loaderType: reference.loaderType,
      };
      this.#moduleConfigs[resolved.name] = {
        name: resolved.name,
        reference: resolvedRef,
        config: resolved.config,
      };
      // The entry app module is the one scanned from baseDir (its module dir IS
      // the cwd); its module.yml is exposed as the app-wide `config`.
      if (path.resolve(resolved.path) === baseDir) {
        this.#appModuleName = resolved.name;
      }
      resolvedReferences.push(resolvedRef);
    }
    this.#moduleReferences = resolvedReferences;
    // The app-wide config is the entry app module's module.yml.
    if (this.#appModuleName) {
      Object.assign(this.#config, this.#moduleConfigs[this.#appModuleName].config);
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

  async #createLoadUnitLoader(opts: InitStandaloneAppOptions): Promise<EggModuleLoader> {
    const loader = new EggModuleLoader(this.#moduleReferences, {
      logger: this.#logger,
      baseDir: opts.baseDir,
      dump: this.#dump,
      manifest: opts.manifest,
      loaderFS: opts.loaderFS,
    });
    await loader.init();
    return loader;
  }

  /**
   * Phase 2: create AND instantiate the InnerObjectLoadUnit before the business
   * graph is built, so `@XxxLifecycleProto` hooks (including graph build hooks
   * they register in `@LifecyclePostInject`) are live for every later phase.
   */
  async #instantiateInnerObjectLoadUnit(loader: EggModuleLoader): Promise<void> {
    StandaloneContextHandler.register();
    const builder = new InnerObjectLoadUnitBuilder();
    for (const moduleDescriptor of loader.moduleDescriptors) {
      builder.addInnerObjectClazzList(moduleDescriptor.innerObjectClazzList ?? [], {
        name: moduleDescriptor.name,
        path: moduleDescriptor.unitPath,
      });
    }
    const loadUnit = await builder.createLoadUnit({
      innerObjects: this.#innerObjects,
    });
    this.#innerLoadUnit = loadUnit;
    this.#innerLoadUnitInstance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
  }

  /** Phase 3/4: build + sort the business graph, then create and instantiate module load units. */
  async #instantiateModuleLoadUnits(loader: EggModuleLoader): Promise<void> {
    const loadUnits = await loader.load();
    this.#loadUnits.push(...loadUnits);
    for (const loadUnit of loadUnits) {
      this.#loadUnitInstances.push(await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit));
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
    if (this.#state === 'ready') return;
    if (this.#state !== 'new') {
      throw new Error(`[tegg/standalone] cannot init app in ${this.#state} state`);
    }

    // Bundle mode: the worker bundler's injected prelude inlines the manifest on
    // globalThis (alongside __EGG_BUNDLE_MODULE_LOADER__), so the user's entry can
    // stay a plain `new ServiceWorkerApp(dir)` with no build-only import and still
    // run outside the bundle (no global → filesystem scan below).
    if (!opts.manifest) {
      const bundleManifest = (globalThis as { __EGG_BUNDLE_MANIFEST__?: unknown }).__EGG_BUNDLE_MANIFEST__;
      if (bundleManifest) {
        opts = { ...opts, manifest: bundleManifest as TeggManifestExtension };
      }
    }

    this.#state = 'initializing';
    TeggScope.registerScope(this.scopeBag);
    try {
      await this.runInScope(async () => {
        this.#initRuntime(opts);
        // In manifest-consume mode the module reference graph was already
        // captured at build time; reuse it instead of re-scanning the filesystem.
        this.#moduleReferences = opts.manifest?.moduleReferences?.length
          ? opts.manifest.moduleReferences
          : StandaloneApp.getModuleReferences(opts.baseDir, opts.dependencies, this.#frameworkDeps);
        this.#loadModuleConfigs();
        const loader = await this.#createLoadUnitLoader(opts);
        await this.#instantiateInnerObjectLoadUnit(loader);
        await this.#instantiateModuleLoadUnits(loader);
        this.#initRunner();
      });
      this.#state = 'ready';
    } catch (error) {
      TeggScope.unregisterScope(this.scopeBag);
      this.#state = 'closed';
      throw error;
    }
  }

  async run<T>(aCtx?: EggContext): Promise<T> {
    if (this.#state !== 'ready') {
      throw new Error(`[tegg/standalone] cannot run app in ${this.#state} state`);
    }
    return this.runInScope(async () => {
      const lifecycle = {};
      const ctx = aCtx || new StandaloneContext();
      return await ContextHandler.run(ctx, async () => {
        if (ctx.init) {
          await ctx.init(lifecycle);
        }
        if (!this.#runnerProto) {
          throw new Error('[tegg/standalone] app is not initialized');
        }
        const eggObject = await EggContainerFactory.getOrCreateEggObject(this.#runnerProto);
        const runner = eggObject.obj as MainRunner<T>;
        try {
          return await runner.main();
        } finally {
          if (ctx.destroy) {
            // Fire-and-forget on purpose: do NOT await here. A host may return a
            // response whose body is drained by the CALLER after run() returns
            // (e.g. the service-worker pipes a streaming Response body and keeps
            // context protos alive via a BackgroundTaskHelper drain task).
            // ctx.destroy() drains those tasks, so awaiting it here would block
            // run() from returning the Response the caller must consume first —
            // a deadlock. App-level teardown determinism is handled by the
            // awaited app.destroy() in appMain (main.ts).
            void ctx.destroy(lifecycle).catch((e: unknown) => {
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
    if (this.#state === 'closed') return;
    if (this.#state === 'initializing') {
      throw new Error('[tegg/standalone] cannot destroy app while it is initializing');
    }

    this.#state = 'closed';
    try {
      await this.runInScope(() => this.#disposeResources());
    } finally {
      TeggScope.unregisterScope(this.scopeBag);
    }
  }

  async #disposeResources(): Promise<void> {
    while (this.#loadUnitInstances.length > 0) {
      const instance = this.#loadUnitInstances.pop();
      if (instance) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      }
    }
    while (this.#loadUnits.length > 0) {
      const loadUnit = this.#loadUnits.pop();
      if (loadUnit) {
        await LoadUnitFactory.destroyLoadUnit(loadUnit);
      }
    }
    if (this.#innerLoadUnitInstance) {
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(this.#innerLoadUnitInstance);
      this.#innerLoadUnitInstance = undefined;
    }
    if (this.#innerLoadUnit) {
      await LoadUnitFactory.destroyLoadUnit(this.#innerLoadUnit);
      this.#innerLoadUnit = undefined;
    }
    ModuleConfigUtil.setConfigNames(undefined);
    this.#runnerProto = undefined;
  }
}
