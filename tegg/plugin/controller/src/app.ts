import assert from 'node:assert';

import { ControllerMetaBuilderFactory } from '@eggjs/controller-decorator';
import {
  CONTROLLER_LOAD_UNIT,
  ControllerLoadUnit,
  ControllerMetadataManager,
  middlewareGraphHook,
  type RootProtoManager,
} from '@eggjs/controller-runtime';
import { EggPrototypeFactory, type LoadUnitLifecycleContext } from '@eggjs/metadata';
import {
  EggContainerFactory,
  type LoadUnitInstanceLifecycleContext,
  ModuleLoadUnitInstance,
} from '@eggjs/tegg-runtime';
import { AGENT_CONTROLLER_PROTO_IMPL_TYPE, TeggScope } from '@eggjs/tegg-types';
import type { Application, ILifecycleBoot } from 'egg';

import { AgentControllerObject } from './lib/AgentControllerObject.ts';
import { AgentControllerProto } from './lib/AgentControllerProto.ts';
import { ControllerLoadUnitHandler } from './lib/ControllerLoadUnitHandler.ts';
import { EggControllerLoader } from './lib/EggControllerLoader.ts';
import type { EggHTTPRegisterProvider } from './lib/impl/http/EggHTTPRegisterProvider.ts';
import { EggMcpRouter } from './lib/impl/mcp/EggMcpRouter.ts';

export default class ControllerAppBootHook implements ILifecycleBoot {
  private readonly app: Application;
  private controllerLoadUnitHandler: ControllerLoadUnitHandler;

  constructor(app: Application) {
    this.app = app;
    this.app.controllerMetaBuilderFactory = ControllerMetaBuilderFactory;
    this.app.eggPrototypeCreatorFactory.registerPrototypeCreator(
      AGENT_CONTROLLER_PROTO_IMPL_TYPE,
      AgentControllerProto.createProto,
    );
    AgentControllerObject.setLogger(this.app.logger);
  }

  configWillLoad(): void {
    // Controller boot registers lifecycle hooks and a per-app-capturing load-unit
    // creator, all of which must land in this app's TeggScope.
    TeggScope.run(this.app._teggScopeBag, () => {
      this.doConfigWillLoad();
    });
  }

  private doConfigWillLoad(): void {
    this.app.eggObjectFactory.registerEggObjectCreateMethod(AgentControllerProto, AgentControllerObject.createObject);
    this.app.loaderFactory.registerLoader(CONTROLLER_LOAD_UNIT, (unitPath) => {
      return new EggControllerLoader(unitPath);
    });
    this.app.loadUnitFactory.registerLoadUnitCreator(
      CONTROLLER_LOAD_UNIT,
      (ctx: LoadUnitLifecycleContext): ControllerLoadUnit => {
        return new ControllerLoadUnit(
          `tegg-app-controller:${ctx.unitPath}`,
          ctx.unitPath,
          ctx.loader,
          this.app.eggPrototypeFactory,
          this.app.eggPrototypeCreatorFactory,
        );
      },
    );
    this.app.loadUnitInstanceFactory.registerLoadUnitInstanceClass(
      CONTROLLER_LOAD_UNIT,
      (ctx: LoadUnitInstanceLifecycleContext): ModuleLoadUnitInstance => {
        return new ModuleLoadUnitInstance(ctx.loadUnit);
      },
    );

    if (this.app.config.security?.csrf !== void 0) {
      assert(
        typeof this.app.config.security.csrf === 'boolean' || typeof this.app.config.security.csrf === 'object',
        'csrf must be boolean or object',
      );

      if (typeof this.app.config.security.csrf === 'boolean') {
        (this.app.config.security as any).csrf = {
          enable: this.app.config.security.csrf,
        };
      }
    }

    // init http root proto middleware
    this.prepareMiddleware(this.app.config.coreMiddleware);
    if (this.mcpEnable()) {
      // Only the MCP config wiring that must land in configWillLoad; the router
      // mount + register wiring happen in didLoad / EggMCPRegisterProvider.

      // Don't let the mcp's body be consumed
      this.app.config.coreMiddleware.unshift('mcpBodyMiddleware');

      if (this.app.config.security.csrf.ignore) {
        if (Array.isArray(this.app.config.security.csrf.ignore)) {
          this.app.config.security.csrf.ignore = [
            /^\/mcp\//,
            this.app.config.mcp.sseInitPath,
            this.app.config.mcp.sseMessagePath,
            this.app.config.mcp.streamPath,
            this.app.config.mcp.statelessStreamPath,
            ...this.app.config.security.csrf.ignore,
          ];
        }
      } else {
        this.app.config.security.csrf.ignore = [
          /^\/mcp\//,
          this.app.config.mcp.sseInitPath,
          this.app.config.mcp.sseMessagePath,
          this.app.config.mcp.streamPath,
          this.app.config.mcp.statelessStreamPath,
        ];
      }

      if (this.app.config.mcp.multipleServer) {
        for (const name of Object.keys(this.app.config.mcp.multipleServer)) {
          ['sseInitPath', 'sseMessagePath', 'streamPath', 'statelessStreamPath'].forEach((key) => {
            if (this.app.config.mcp.multipleServer[name][key])
              (this.app.config.security.csrf.ignore as any[]).push(this.app.config.mcp.multipleServer[name][key]);
          });
        }
      }
    }
  }

  prepareMiddleware(middlewareNames: string[]): string[] {
    if (!middlewareNames.includes('teggCtxLifecycleMiddleware')) {
      middlewareNames.unshift('teggCtxLifecycleMiddleware');
    }

    const index = middlewareNames.indexOf('teggCtxLifecycleMiddleware');
    middlewareNames.splice(index, 0, 'teggRootProto');
    return middlewareNames;
  }

  // The boot hook is an egg ILifecycleBoot, not a DI proto, so it cannot `@Inject`.
  async #resolveInnerObject<T>(name: string): Promise<T> {
    const proto = EggPrototypeFactory.instance.getPrototype(name);
    return (await EggContainerFactory.getOrCreateEggObject(proto)).obj as T;
  }

  async didLoad(): Promise<void> {
    if (this.mcpEnable()) {
      // Mount the per-app router on `app` before the inner-object graph builds,
      // so its compat proto reaches inner objects (see EggMCPRegisterProvider).
      this.app.mcpRouter = new EggMcpRouter(this.app);
    }
    await this.app.moduleHandler.ready();
    await TeggScope.run(this.app._teggScopeBag, async () => {
      // The inner objects are already instantiated by moduleHandler.ready(), so
      // the register providers' @LifecyclePostInject has plugged the HTTP/MCP
      // creators into the factory. We only need the rootProtoManager instance
      // (teggRootProto middleware reads `ctx.app.rootProtoManager`; it cannot
      // inject) and the httpRegisterProvider handle to drive doRegister below.
      this.app.rootProtoManager = await this.#resolveInnerObject<RootProtoManager>('rootProtoManager');
      const httpRegisterProvider = await this.#resolveInnerObject<EggHTTPRegisterProvider>('httpRegisterProvider');

      this.controllerLoadUnitHandler = new ControllerLoadUnitHandler(this.app);
      await this.controllerLoadUnitHandler.ready();

      // Mount all HTTP controller methods, priority-sorted, after collection.
      httpRegisterProvider.doRegister(this.app.rootProtoManager);
      this.app.config.mcp.hooks = EggMcpRouter.hooks;
    });
  }

  configDidLoad(): void {
    // The per-app GlobalGraph does not exist yet (it is created inside
    // moduleHandler.init() during didLoad), so registering on the graph here
    // would be a silent no-op and cross-module controller middleware inject
    // edges would never be woven. Buffer the hook on moduleHandler instead —
    // it is flushed onto the graph right after creation, before build() runs.
    // moduleHandler is created in the tegg plugin's configDidLoad, which runs
    // before ours (teggController declares a dependency on tegg).
    this.app.moduleHandler.registerGlobalGraphBuildHook(middlewareGraphHook);
  }

  mcpEnable(): boolean {
    return !!this.app.plugins.mcpProxy?.enable;
  }

  async beforeClose(): Promise<void> {
    await TeggScope.run(this.app._teggScopeBag, async () => {
      if (this.controllerLoadUnitHandler) {
        await this.controllerLoadUnitHandler.destroy();
      }
      // The module-declared controller hooks, the httpRegisterProvider (and its
      // HTTPControllerRegister), and the MCP register/router all deregister /
      // tear down with the InnerObjectLoadUnit and the app bag — no static
      // instance to clean.
      ControllerMetadataManager.instance.clear();
    });
  }
}
